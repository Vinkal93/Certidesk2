import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection } from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SubscriptionPlanRecord } from "./su-platform.service";
import type { SessionUser } from "@/types/auth";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "suspended"
  | "cancelled";

export interface SubscriptionLimitsSnapshot {
  maxStudents: number;
  maxStaff: number;
  storageLimitMb: number;
}

export interface InstituteSubscriptionRecord {
  id: string;
  instituteId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: "monthly" | "yearly";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  /** Preserves the contracted price at assignment time even if catalog pricing changes later. */
  priceSnapshotRupees: number;
  limitsSnapshot: SubscriptionLimitsSnapshot;
  createdAt: string;
  updatedAt: string;
  updatedByUid: string;
}

export interface EntitlementOverrideRecord {
  id: string;
  instituteId: string;
  featureKey: string;
  enabled: boolean;
  limitOverride?: number;
  reason: string;
  expiresAt?: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementDecision {
  allowed: boolean;
  source: "override" | "subscription" | "default_deny";
  limit?: number;
  currentUsage?: number;
  reason: string;
}

function subscriptionsCol() {
  return getAdminFirestore().collection(
    "subscriptions"
  ) as CollectionReference<InstituteSubscriptionRecord>;
}

function entitlementOverridesCol() {
  return getAdminFirestore().collection(
    "entitlementOverrides"
  ) as CollectionReference<EntitlementOverrideRecord>;
}

function plansCol() {
  return getAdminFirestore().collection(
    "subscription_plans"
  ) as CollectionReference<SubscriptionPlanRecord>;
}

function assertSuperAdmin(actor: SessionUser) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
}

/**
 * Pure entitlement resolution helper for deterministic evaluation and testing.
 */
export function resolveEntitlementDecision(params: {
  featureKey: string;
  subscription: InstituteSubscriptionRecord | null;
  override: EntitlementOverrideRecord | null;
  currentUsage?: number;
  now?: Date;
}): EntitlementDecision {
  const now = params.now ?? new Date();
  const { featureKey, subscription, override, currentUsage } = params;

  if (override) {
    const isExpired =
      override.expiresAt !== undefined &&
      new Date(override.expiresAt).getTime() <= now.getTime();
    if (!isExpired) {
      if (!override.enabled) {
        return {
          allowed: false,
          source: "override",
          reason: `Explicitly disabled by override: ${override.reason}`,
        };
      }
      if (
        override.limitOverride !== undefined &&
        currentUsage !== undefined &&
        currentUsage >= override.limitOverride
      ) {
        return {
          allowed: false,
          source: "override",
          limit: override.limitOverride,
          currentUsage,
          reason: `Override quota limit (${override.limitOverride}) reached for ${featureKey}.`,
        };
      }
      return {
        allowed: true,
        source: "override",
        ...(override.limitOverride !== undefined ? { limit: override.limitOverride } : {}),
        ...(currentUsage !== undefined ? { currentUsage } : {}),
        reason: `Allowed by entitlement override: ${override.reason}`,
      };
    }
  }

  if (!subscription) {
    return {
      allowed: false,
      source: "default_deny",
      reason: "No active subscription assigned to institute.",
    };
  }

  if (subscription.status === "suspended" || subscription.status === "cancelled") {
    return {
      allowed: false,
      source: "subscription",
      reason: `Subscription status is ${subscription.status}.`,
    };
  }

  let limit: number | undefined;
  if (featureKey === "students") {
    limit = subscription.limitsSnapshot.maxStudents;
  } else if (featureKey === "staff") {
    limit = subscription.limitsSnapshot.maxStaff;
  } else if (featureKey === "storage_mb") {
    limit = subscription.limitsSnapshot.storageLimitMb;
  }

  if (limit !== undefined && currentUsage !== undefined && currentUsage >= limit) {
    return {
      allowed: false,
      source: "subscription",
      limit,
      currentUsage,
      reason: `Plan limit (${limit}) reached for ${featureKey}.`,
    };
  }

  return {
    allowed: true,
    source: "subscription",
    ...(limit !== undefined ? { limit } : {}),
    ...(currentUsage !== undefined ? { currentUsage } : {}),
    reason: `Allowed under plan ${subscription.planName}.`,
  };
}

export async function checkInstituteEntitlement(
  instituteId: string,
  featureKey: string,
  currentUsage?: number
): Promise<EntitlementDecision> {
  const [subSnap, overrideSnap] = await Promise.all([
    subscriptionsCol().where("instituteId", "==", instituteId).limit(1).get(),
    entitlementOverridesCol()
      .where("instituteId", "==", instituteId)
      .where("featureKey", "==", featureKey)
      .limit(1)
      .get(),
  ]);

  const subscription = subSnap.empty ? null : (subSnap.docs[0]?.data() ?? null);
  const override = overrideSnap.empty ? null : (overrideSnap.docs[0]?.data() ?? null);

  return resolveEntitlementDecision({
    featureKey,
    subscription,
    override,
    ...(currentUsage !== undefined ? { currentUsage } : {}),
  });
}

export async function assignInstituteSubscription(
  actor: SessionUser,
  input: {
    instituteId: string;
    planId: string;
    billingCycle: "monthly" | "yearly";
    status?: SubscriptionStatus;
    customPriceRupees?: number;
  }
): Promise<InstituteSubscriptionRecord> {
  assertSuperAdmin(actor);

  const [instDoc, planDoc] = await Promise.all([
    institutesCollection().doc(input.instituteId).get(),
    plansCol().doc(input.planId).get(),
  ]);

  if (!instDoc.exists) {
    throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
  }
  const plan = planDoc.data();
  if (!plan) {
    throw new AuthError(404, "PLAN_NOT_FOUND", "Subscription plan not found.");
  }

  const now = new Date();
  const periodEnd = new Date(now);
  if (input.billingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const priceSnapshotRupees =
    input.customPriceRupees ??
    (input.billingCycle === "yearly" ? plan.yearlyDisplayRupees : plan.monthlyDisplayRupees);

  const existingSnap = await subscriptionsCol()
    .where("instituteId", "==", input.instituteId)
    .limit(1)
    .get();
  const existingDoc = existingSnap.empty ? null : existingSnap.docs[0];
  const subId = existingDoc ? existingDoc.id : generateId("sub");
  const nowIso = now.toISOString();

  const record: InstituteSubscriptionRecord = {
    id: subId,
    instituteId: input.instituteId,
    planId: plan.id,
    planName: plan.name,
    status: input.status ?? "active",
    billingCycle: input.billingCycle,
    currentPeriodStart: nowIso,
    currentPeriodEnd: periodEnd.toISOString(),
    priceSnapshotRupees,
    limitsSnapshot: {
      maxStudents: plan.maxStudents,
      maxStaff: plan.maxStaff,
      storageLimitMb: plan.storageLimitMb,
    },
    createdAt: existingDoc?.data().createdAt ?? nowIso,
    updatedAt: nowIso,
    updatedByUid: actor.uid,
  };

  await subscriptionsCol().doc(subId).set(record);

  await recordAuditLog({
    action: "SUBSCRIPTION_ASSIGNED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: input.instituteId,
    targetId: subId,
    metadata: {
      planId: plan.id,
      planName: plan.name,
      billingCycle: input.billingCycle,
      priceSnapshotRupees,
      status: record.status,
    },
  });

  return record;
}

export async function setEntitlementOverride(
  actor: SessionUser,
  input: {
    instituteId: string;
    featureKey: string;
    enabled: boolean;
    limitOverride?: number;
    reason: string;
    expiresAt?: string;
  }
): Promise<EntitlementOverrideRecord> {
  assertSuperAdmin(actor);
  if (!input.reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Override reason is required.");
  }

  const docId = `${input.instituteId}_${input.featureKey}`;
  const existing = await entitlementOverridesCol().doc(docId).get();
  const nowIso = new Date().toISOString();

  const record: EntitlementOverrideRecord = {
    id: docId,
    instituteId: input.instituteId,
    featureKey: input.featureKey,
    enabled: input.enabled,
    ...(input.limitOverride !== undefined ? { limitOverride: input.limitOverride } : {}),
    reason: input.reason.trim(),
    ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
    createdByUid: existing.data()?.createdByUid ?? actor.uid,
    createdAt: existing.data()?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  await entitlementOverridesCol().doc(docId).set(record);

  await recordAuditLog({
    action: "ENTITLEMENT_OVERRIDE_SET",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: input.instituteId,
    targetId: docId,
    metadata: {
      featureKey: input.featureKey,
      enabled: input.enabled,
      limitOverride: input.limitOverride ?? null,
      reason: record.reason,
      expiresAt: input.expiresAt ?? null,
    },
  });

  return record;
}

export async function listSubscriptionsAndOverrides(actor: SessionUser) {
  assertSuperAdmin(actor);
  const [subsSnap, overridesSnap, plansSnap, institutesSnap] = await Promise.all([
    subscriptionsCol().get(),
    entitlementOverridesCol().get(),
    plansCol().get(),
    institutesCollection().get(),
  ]);

  return {
    subscriptions: subsSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    overrides: overridesSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    plans: plansSnap.docs.map((d) => d.data()),
    institutes: institutesSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      code: d.data().code,
      status: d.data().status,
    })),
  };
}
