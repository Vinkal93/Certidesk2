import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { AuthError } from "@/lib/security/session";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";

export interface FeatureFlagHistoryEntry {
  version: number;
  globalEnabled: boolean;
  killSwitchActive: boolean;
  planAllowlist: string[];
  instituteOverrides: Record<string, boolean>;
  changedByUid: string;
  changedAt: string;
  reason: string;
}

export interface FeatureFlagRecord {
  key: string;
  name: string;
  description: string;
  globalEnabled: boolean;
  killSwitchActive: boolean;
  planAllowlist: string[];
  instituteOverrides: Record<string, boolean>;
  version: number;
  updatedByUid: string;
  updatedAt: string;
  history: FeatureFlagHistoryEntry[];
}

function featureFlagsCol() {
  return getAdminFirestore().collection(
    "featureFlags"
  ) as CollectionReference<FeatureFlagRecord>;
}

function assertSuperAdmin(actor: SessionUser) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
}

/**
 * Pure feature-flag evaluator:
 * 1. Kill switch forces false everywhere.
 * 2. Institute-specific override takes precedence over plan/global.
 * 3. Plan allowlist (when non-empty) restricts flag to listed plans.
 * 4. Otherwise falls back to globalEnabled.
 */
export function evaluateFeatureFlag(
  flag: Pick<
    FeatureFlagRecord,
    "globalEnabled" | "killSwitchActive" | "planAllowlist" | "instituteOverrides"
  >,
  context: { instituteId?: string; planId?: string } = {}
): boolean {
  if (flag.killSwitchActive) {
    return false;
  }
  if (
    context.instituteId !== undefined &&
    Object.prototype.hasOwnProperty.call(flag.instituteOverrides, context.instituteId)
  ) {
    return Boolean(flag.instituteOverrides[context.instituteId]);
  }
  if (flag.planAllowlist.length > 0) {
    if (!context.planId) {
      return false;
    }
    return flag.planAllowlist.includes(context.planId);
  }
  return flag.globalEnabled;
}

export async function listFeatureFlags(actor: SessionUser): Promise<FeatureFlagRecord[]> {
  assertSuperAdmin(actor);
  const snap = await featureFlagsCol().get();
  return snap.docs.map((d) => d.data()).sort((a, b) => a.key.localeCompare(b.key));
}

export async function isFeatureEnabledForContext(
  key: string,
  context: { instituteId?: string; planId?: string } = {}
): Promise<boolean> {
  const doc = await featureFlagsCol().doc(key).get();
  const flag = doc.data();
  if (!flag) {
    return true;
  }
  return evaluateFeatureFlag(flag, context);
}

export async function upsertFeatureFlag(
  actor: SessionUser,
  input: {
    key: string;
    name: string;
    description: string;
    globalEnabled: boolean;
    killSwitchActive: boolean;
    planAllowlist?: string[];
    instituteOverrides?: Record<string, boolean>;
    reason: string;
  }
): Promise<FeatureFlagRecord> {
  assertSuperAdmin(actor);
  const normalizedKey = input.key.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
  if (!normalizedKey) {
    throw new AuthError(400, "INVALID_FLAG_KEY", "Feature flag key is required.");
  }
  if (!input.reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Change reason is required for audit trail.");
  }

  const ref = featureFlagsCol().doc(normalizedKey);
  const existing = (await ref.get()).data();
  const now = new Date().toISOString();
  const nextVersion = (existing?.version ?? 0) + 1;

  const historyEntry: FeatureFlagHistoryEntry | null = existing
    ? {
        version: existing.version,
        globalEnabled: existing.globalEnabled,
        killSwitchActive: existing.killSwitchActive,
        planAllowlist: existing.planAllowlist,
        instituteOverrides: existing.instituteOverrides,
        changedByUid: actor.uid,
        changedAt: now,
        reason: input.reason.trim(),
      }
    : null;

  const nextRecord: FeatureFlagRecord = {
    key: normalizedKey,
    name: input.name.trim(),
    description: input.description.trim(),
    globalEnabled: input.globalEnabled,
    killSwitchActive: input.killSwitchActive,
    planAllowlist: input.planAllowlist ?? existing?.planAllowlist ?? [],
    instituteOverrides: input.instituteOverrides ?? existing?.instituteOverrides ?? {},
    version: nextVersion,
    updatedByUid: actor.uid,
    updatedAt: now,
    history: historyEntry
      ? [historyEntry, ...(existing?.history ?? [])].slice(0, 25)
      : (existing?.history ?? []),
  };

  await ref.set(nextRecord);

  await recordAuditLog({
    action: input.killSwitchActive
      ? "FEATURE_FLAG_KILL_SWITCH_ENABLED"
      : "FEATURE_FLAG_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: normalizedKey,
    metadata: {
      version: nextVersion,
      globalEnabled: nextRecord.globalEnabled,
      killSwitchActive: nextRecord.killSwitchActive,
      reason: input.reason.trim(),
    },
  });

  return nextRecord;
}

export async function rollbackFeatureFlag(
  actor: SessionUser,
  key: string,
  targetVersion: number,
  reason: string
): Promise<FeatureFlagRecord> {
  assertSuperAdmin(actor);
  if (!reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Rollback reason is required.");
  }

  const ref = featureFlagsCol().doc(key);
  const existing = (await ref.get()).data();
  if (!existing) {
    throw new AuthError(404, "FLAG_NOT_FOUND", "Feature flag not found.");
  }

  const target = existing.history.find((h) => h.version === targetVersion);
  if (!target) {
    throw new AuthError(404, "VERSION_NOT_FOUND", `Version ${targetVersion} not found in flag history.`);
  }

  const now = new Date().toISOString();
  const nextVersion = existing.version + 1;
  const previousSnapshot: FeatureFlagHistoryEntry = {
    version: existing.version,
    globalEnabled: existing.globalEnabled,
    killSwitchActive: existing.killSwitchActive,
    planAllowlist: existing.planAllowlist,
    instituteOverrides: existing.instituteOverrides,
    changedByUid: actor.uid,
    changedAt: now,
    reason: `Rollback to v${targetVersion}: ${reason.trim()}`,
  };

  const rolledBack: FeatureFlagRecord = {
    ...existing,
    globalEnabled: target.globalEnabled,
    killSwitchActive: target.killSwitchActive,
    planAllowlist: target.planAllowlist,
    instituteOverrides: target.instituteOverrides,
    version: nextVersion,
    updatedByUid: actor.uid,
    updatedAt: now,
    history: [previousSnapshot, ...existing.history].slice(0, 25),
  };

  await ref.set(rolledBack);

  await recordAuditLog({
    action: "FEATURE_FLAG_ROLLED_BACK",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: key,
    metadata: {
      fromVersion: existing.version,
      toVersion: targetVersion,
      newVersion: nextVersion,
      reason: reason.trim(),
    },
  });

  return rolledBack;
}
