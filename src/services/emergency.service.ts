import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";

export interface EmergencyControlFlags {
  maintenanceMode: boolean;
  readOnlyMode: boolean;
  registrationPaused: boolean;
  paymentsPaused: boolean;
  certificatesPaused: boolean;
}

export interface EmergencyControlState extends EmergencyControlFlags {
  id: "emergency_state";
  reason: string;
  expiresAt?: string;
  updatedAt: string;
  updatedByUid: string;
}

export interface EmergencyActionRecord {
  id: string;
  actionType: "update_controls" | "rollback";
  reason: string;
  beforeState: EmergencyControlFlags;
  afterState: EmergencyControlFlags;
  expiresAt?: string;
  actorUid: string;
  createdAt: string;
  rolledBackFromActionId?: string;
}

export type IncidentSeverity = "sev1" | "sev2" | "sev3" | "sev4";
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";

export interface PlatformIncidentRecord {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedComponents: string[];
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionSummary?: string;
}

export const DEFAULT_EMERGENCY_FLAGS: EmergencyControlFlags = {
  maintenanceMode: false,
  readOnlyMode: false,
  registrationPaused: false,
  paymentsPaused: false,
  certificatesPaused: false,
};

function emergencyStateCol() {
  return getAdminFirestore().collection(
    "platform_config"
  ) as CollectionReference<EmergencyControlState>;
}

function emergencyActionsCol() {
  return getAdminFirestore().collection(
    "emergencyActions"
  ) as CollectionReference<EmergencyActionRecord>;
}

function incidentsCol() {
  return getAdminFirestore().collection(
    "platformIncidents"
  ) as CollectionReference<PlatformIncidentRecord>;
}

function assertSuperAdmin(actor: SessionUser) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
}

/**
 * Pure helper that automatically rolls back expired emergency controls.
 */
export function resolveActiveEmergencyState(
  state: EmergencyControlState | null,
  now = new Date()
): { flags: EmergencyControlFlags; expired: boolean; expiresAt?: string; reason: string } {
  if (!state) {
    return {
      flags: { ...DEFAULT_EMERGENCY_FLAGS },
      expired: false,
      reason: "Normal operations",
    };
  }
  if (state.expiresAt !== undefined && new Date(state.expiresAt).getTime() <= now.getTime()) {
    return {
      flags: { ...DEFAULT_EMERGENCY_FLAGS },
      expired: true,
      expiresAt: state.expiresAt,
      reason: `Expired at ${state.expiresAt}`,
    };
  }
  return {
    flags: {
      maintenanceMode: state.maintenanceMode,
      readOnlyMode: state.readOnlyMode,
      registrationPaused: state.registrationPaused,
      paymentsPaused: state.paymentsPaused,
      certificatesPaused: state.certificatesPaused,
    },
    expired: false,
    ...(state.expiresAt !== undefined ? { expiresAt: state.expiresAt } : {}),
    reason: state.reason,
  };
}

export async function getEmergencyOverview(actor: SessionUser) {
  assertSuperAdmin(actor);
  const [stateDoc, actionsSnap, incidentsSnap] = await Promise.all([
    emergencyStateCol().doc("emergency_state").get(),
    emergencyActionsCol().orderBy("createdAt", "desc").limit(30).get(),
    incidentsCol().orderBy("createdAt", "desc").limit(30).get(),
  ]);

  const rawState = stateDoc.data() ?? null;
  const resolved = resolveActiveEmergencyState(rawState);

  return {
    active: resolved,
    rawState,
    actions: actionsSnap.docs.map((d) => d.data()),
    incidents: incidentsSnap.docs.map((d) => d.data()),
  };
}

export async function applyEmergencyAction(
  actor: SessionUser,
  input: {
    flags: Partial<EmergencyControlFlags>;
    reason: string;
    expiresInMinutes?: number;
  }
): Promise<{ state: EmergencyControlState; action: EmergencyActionRecord }> {
  assertSuperAdmin(actor);
  if (!input.reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Emergency action reason is required.");
  }

  const stateRef = emergencyStateCol().doc("emergency_state");
  const currentDoc = (await stateRef.get()).data() ?? null;
  const currentResolved = resolveActiveEmergencyState(currentDoc);
  const beforeState = currentResolved.flags;

  const afterState: EmergencyControlFlags = {
    maintenanceMode: input.flags.maintenanceMode ?? beforeState.maintenanceMode,
    readOnlyMode: input.flags.readOnlyMode ?? beforeState.readOnlyMode,
    registrationPaused: input.flags.registrationPaused ?? beforeState.registrationPaused,
    paymentsPaused: input.flags.paymentsPaused ?? beforeState.paymentsPaused,
    certificatesPaused: input.flags.certificatesPaused ?? beforeState.certificatesPaused,
  };

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt =
    input.expiresInMinutes !== undefined && input.expiresInMinutes > 0
      ? new Date(now.getTime() + input.expiresInMinutes * 60_000).toISOString()
      : undefined;

  const nextState: EmergencyControlState = {
    id: "emergency_state",
    ...afterState,
    reason: input.reason.trim(),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
    updatedAt: nowIso,
    updatedByUid: actor.uid,
  };

  const actionId = generateId("emg");
  const actionRecord: EmergencyActionRecord = {
    id: actionId,
    actionType: "update_controls",
    reason: input.reason.trim(),
    beforeState,
    afterState,
    ...(expiresAt !== undefined ? { expiresAt } : {}),
    actorUid: actor.uid,
    createdAt: nowIso,
  };

  await Promise.all([
    stateRef.set(nextState),
    emergencyActionsCol().doc(actionId).set(actionRecord),
  ]);

  await recordAuditLog({
    action: "EMERGENCY_ACTION_APPLIED",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: actionId,
    metadata: {
      reason: input.reason.trim(),
      beforeState: JSON.stringify(beforeState),
      afterState: JSON.stringify(afterState),
      expiresAt: expiresAt ?? null,
    },
  });

  return { state: nextState, action: actionRecord };
}

export async function rollbackEmergencyAction(
  actor: SessionUser,
  actionId: string,
  reason: string
): Promise<{ state: EmergencyControlState; action: EmergencyActionRecord }> {
  assertSuperAdmin(actor);
  if (!reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Rollback reason is required.");
  }

  const targetActionDoc = await emergencyActionsCol().doc(actionId).get();
  const targetAction = targetActionDoc.data();
  if (!targetAction) {
    throw new AuthError(404, "ACTION_NOT_FOUND", "Emergency action record not found.");
  }

  const stateRef = emergencyStateCol().doc("emergency_state");
  const currentDoc = (await stateRef.get()).data() ?? null;
  const beforeState = resolveActiveEmergencyState(currentDoc).flags;
  const afterState = targetAction.beforeState;

  const nowIso = new Date().toISOString();
  const nextState: EmergencyControlState = {
    id: "emergency_state",
    ...afterState,
    reason: `Rollback of ${actionId}: ${reason.trim()}`,
    updatedAt: nowIso,
    updatedByUid: actor.uid,
  };

  const rollbackId = generateId("emg");
  const rollbackRecord: EmergencyActionRecord = {
    id: rollbackId,
    actionType: "rollback",
    reason: reason.trim(),
    beforeState,
    afterState,
    actorUid: actor.uid,
    createdAt: nowIso,
    rolledBackFromActionId: actionId,
  };

  await Promise.all([
    stateRef.set(nextState),
    emergencyActionsCol().doc(rollbackId).set(rollbackRecord),
  ]);

  await recordAuditLog({
    action: "EMERGENCY_ACTION_ROLLED_BACK",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: rollbackId,
    metadata: {
      rolledBackFromActionId: actionId,
      reason: reason.trim(),
      beforeState: JSON.stringify(beforeState),
      afterState: JSON.stringify(afterState),
    },
  });

  return { state: nextState, action: rollbackRecord };
}

export async function createPlatformIncident(
  actor: SessionUser,
  input: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    affectedComponents: string[];
  }
): Promise<PlatformIncidentRecord> {
  assertSuperAdmin(actor);
  const id = generateId("inc");
  const nowIso = new Date().toISOString();
  const record: PlatformIncidentRecord = {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity,
    status: "investigating",
    affectedComponents: input.affectedComponents,
    createdByUid: actor.uid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await incidentsCol().doc(id).set(record);
  await recordAuditLog({
    action: "INCIDENT_CREATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: id,
    metadata: {
      title: record.title,
      severity: record.severity,
      affectedComponents: record.affectedComponents.join(", "),
    },
  });
  return record;
}

export async function updatePlatformIncident(
  actor: SessionUser,
  input: {
    id: string;
    status: IncidentStatus;
    resolutionSummary?: string;
  }
): Promise<PlatformIncidentRecord> {
  assertSuperAdmin(actor);
  const ref = incidentsCol().doc(input.id);
  const existing = (await ref.get()).data();
  if (!existing) {
    throw new AuthError(404, "INCIDENT_NOT_FOUND", "Incident not found.");
  }
  const nowIso = new Date().toISOString();
  const updated: PlatformIncidentRecord = {
    ...existing,
    status: input.status,
    updatedAt: nowIso,
    ...(input.status === "resolved" ? { resolvedAt: nowIso } : {}),
    ...(input.resolutionSummary !== undefined
      ? { resolutionSummary: input.resolutionSummary.trim() }
      : {}),
  };

  await ref.set(updated);
  await recordAuditLog({
    action: "INCIDENT_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: input.id,
    metadata: {
      status: input.status,
      resolutionSummary: input.resolutionSummary ?? null,
    },
  });
  return updated;
}
