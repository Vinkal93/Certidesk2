import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection, usersCollection } from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import { getRazorpayGatewayConfig } from "./gateway.service";
import {
  EMERGENCY_COLLECTIONS,
  evaluatePlatformPolicy,
  maintenanceEventsCol,
  platformLockdownsCol,
  serviceRestrictionsCol,
} from "./emergency-policy.service";
import {
  INCIDENT_TRANSITIONS,
  SERVICE_REGISTRY,
  type EmergencyAuditRecord,
  type EnterpriseIncidentSeverity,
  type EnterpriseIncidentStatus,
  type HealthCheckSample,
  type IncidentCategory,
  type IncidentCommentRecord,
  type IncidentRecord,
  type LockdownType,
  type MaintenanceEventRecord,
  type MaintenanceScope,
  type MaintenanceType,
  type PlatformLockdownRecord,
  type RecoveryOperationRecord,
  type RecoveryStepRecord,
  type RecoveryType,
  type RestrictionType,
  type ServiceHealthStatus,
  type ServiceRestrictionRecord,
} from "@/types/emergency";
import type { SessionUser } from "@/types/auth";

function incidentsCol() {
  return getAdminFirestore().collection(
    EMERGENCY_COLLECTIONS.INCIDENTS
  ) as CollectionReference<IncidentRecord>;
}

function incidentCommentsCol() {
  return getAdminFirestore().collection(
    EMERGENCY_COLLECTIONS.INCIDENT_COMMENTS
  ) as CollectionReference<IncidentCommentRecord>;
}

function recoveryOpsCol() {
  return getAdminFirestore().collection(
    EMERGENCY_COLLECTIONS.RECOVERY_OPERATIONS
  ) as CollectionReference<RecoveryOperationRecord>;
}

function recoveryStepsCol() {
  return getAdminFirestore().collection(
    EMERGENCY_COLLECTIONS.RECOVERY_STEPS
  ) as CollectionReference<RecoveryStepRecord>;
}

function healthChecksCol() {
  return getAdminFirestore().collection(
    EMERGENCY_COLLECTIONS.HEALTH_CHECKS
  ) as CollectionReference<HealthCheckSample>;
}

function emergencyAuditCol() {
  return getAdminFirestore().collection(
    EMERGENCY_COLLECTIONS.EMERGENCY_AUDIT
  ) as CollectionReference<EmergencyAuditRecord>;
}

function assertSuperAdmin(actor: SessionUser) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
}

async function writeEmergencyAudit(input: {
  actor: SessionUser;
  action: string;
  targetType: string;
  targetId: string;
  previousState?: string;
  newState?: string;
  reason: string;
  result?: "success" | "failure";
}) {
  const id = generateId("eaud");
  const correlationId = generateId("cor");
  const nowIso = new Date().toISOString();

  const record: EmergencyAuditRecord = {
    id,
    actorUid: input.actor.uid,
    actorRole: input.actor.role,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    ...(input.previousState !== undefined ? { previousState: input.previousState } : {}),
    ...(input.newState !== undefined ? { newState: input.newState } : {}),
    reason: input.reason,
    correlationId,
    result: input.result ?? "success",
    createdAt: nowIso,
  };

  await Promise.all([
    emergencyAuditCol().doc(id).set(record),
    recordAuditLog({
      action: "EMERGENCY_ACTION_APPLIED",
      actorUid: input.actor.uid,
      actorRole: input.actor.role,
      targetId: input.targetId,
      metadata: {
        emergencyAction: input.action,
        targetType: input.targetType,
        reason: input.reason,
        correlationId,
        result: record.result,
      },
    }),
  ]);

  return record;
}

/**
 * Normalizes legacy sev1..sev4 / investigating..resolved incidents into the enterprise model.
 */
function normalizeIncidentRecord(raw: Record<string, unknown>): IncidentRecord {
  const sevMap: Record<string, EnterpriseIncidentSeverity> = {
    sev1: "critical",
    sev2: "high",
    sev3: "medium",
    sev4: "low",
    critical: "critical",
    high: "high",
    medium: "medium",
    low: "low",
    info: "info",
  };
  const statusMap: Record<string, EnterpriseIncidentStatus> = {
    detected: "detected",
    acknowledged: "acknowledged",
    investigating: "investigating",
    identified: "investigating",
    mitigating: "mitigating",
    monitoring: "monitoring",
    resolved: "resolved",
    closed: "closed",
  };

  const rawSev = String(raw.severity ?? "medium");
  const rawStatus = String(raw.status ?? "detected");

  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? "Untitled Incident"),
    description: String(raw.description ?? ""),
    category: (raw.category as IncidentCategory) ?? "availability",
    severity: sevMap[rawSev] ?? "medium",
    status: statusMap[rawStatus] ?? "detected",
    affectedServices: Array.isArray(raw.affectedServices)
      ? (raw.affectedServices as string[])
      : Array.isArray(raw.affectedComponents)
        ? (raw.affectedComponents as string[])
        : [],
    affectedInstituteIds: Array.isArray(raw.affectedInstituteIds)
      ? (raw.affectedInstituteIds as string[])
      : [],
    detectionSource: String(raw.detectionSource ?? "Super Admin Console"),
    reportedByUid: String(raw.reportedByUid ?? raw.createdByUid ?? "system"),
    ...(typeof raw.assignedToUid === "string"
      ? { assignedToUid: raw.assignedToUid }
      : {}),
    ...(typeof raw.impactDescription === "string"
      ? { impactDescription: raw.impactDescription }
      : {}),
    ...(typeof raw.internalNotes === "string"
      ? { internalNotes: raw.internalNotes }
      : {}),
    ...(typeof raw.resolutionSummary === "string"
      ? { resolutionSummary: raw.resolutionSummary }
      : {}),
    relatedIncidentIds: Array.isArray(raw.relatedIncidentIds)
      ? (raw.relatedIncidentIds as string[])
      : [],
    ...(typeof raw.acknowledgedAt === "string"
      ? { acknowledgedAt: raw.acknowledgedAt }
      : {}),
    ...(typeof raw.resolvedAt === "string" ? { resolvedAt: raw.resolvedAt } : {}),
    ...(typeof raw.closedAt === "string" ? { closedAt: raw.closedAt } : {}),
    createdByUid: String(raw.createdByUid ?? "system"),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

export async function runLiveHealthProbe(
  actor: SessionUser,
  options?: { persist?: boolean }
): Promise<HealthCheckSample> {
  assertSuperAdmin(actor);
  const nowIso = new Date().toISOString();

  // 1. Application
  const appStart = Date.now();
  const appStatus: ServiceHealthStatus = "healthy";
  const appLatency = Math.max(1, Date.now() - appStart);

  // 2. Firebase Auth
  let authStatus: ServiceHealthStatus = "unknown";
  let authLatency = 0;
  try {
    const t0 = Date.now();
    await getAdminAuth().listUsers(1);
    authLatency = Date.now() - t0;
    authStatus = authLatency > 2500 ? "degraded" : "healthy";
  } catch {
    authStatus = "unavailable";
  }

  // 3. Cloud Firestore
  let dbStatus: ServiceHealthStatus = "unknown";
  let dbLatency = 0;
  try {
    const t0 = Date.now();
    await institutesCollection().limit(1).get();
    dbLatency = Date.now() - t0;
    dbStatus = dbLatency > 2000 ? "degraded" : "healthy";
  } catch {
    dbStatus = "unavailable";
  }

  // 4. Razorpay Gateway
  let razorpayStatus: ServiceHealthStatus = "not_configured";
  let razorpayDetail = "Not configured";
  try {
    const gw = await getRazorpayGatewayConfig();
    const envName = gw.activeEnvironment ?? "test";
    const envStatus = envName === "live" ? gw.liveStatus : gw.testStatus;
    if (!gw.enabled) {
      razorpayStatus = "not_configured";
      razorpayDetail = "Gateway disabled in configuration";
    } else if (envStatus === "ACTIVE" || envStatus === "VERIFIED") {
      razorpayStatus = "healthy";
      razorpayDetail = `Environment: ${envName} (${envStatus})`;
    } else if (envStatus === "CONNECTION_FAILED") {
      razorpayStatus = "unavailable";
      razorpayDetail = `Environment: ${envName} (${envStatus})`;
    } else {
      razorpayStatus = "degraded";
      razorpayDetail = `Environment: ${envName} (${envStatus})`;
    }
  } catch {
    razorpayStatus = "unknown";
    razorpayDetail = "Unable to read gateway configuration";
  }

  // 5. Notifications (Firestore announcements/popup channel)
  const notifStatus: ServiceHealthStatus = dbStatus === "healthy" ? "healthy" : dbStatus;
  const notifDetail =
    notifStatus === "healthy"
      ? "In-app & Super Admin announcement channels operational"
      : "Dependent on Firestore availability";

  // 6. Backup Provider (Honest detection — never fake!)
  const backupBucket = process.env.FIREBASE_BACKUP_BUCKET?.trim();
  const backupStatus: ServiceHealthStatus = backupBucket ? "healthy" : "not_configured";
  const backupDetail = backupBucket
    ? `Configured bucket: ${backupBucket.slice(0, 6)}***`
    : "Not Configured (set FIREBASE_BACKUP_BUCKET & Cloud Scheduler for automated exports)";

  const coreStatuses = [appStatus, authStatus, dbStatus];
  const overallStatus: ServiceHealthStatus = coreStatuses.includes("unavailable")
    ? "unavailable"
    : coreStatuses.includes("degraded") || razorpayStatus === "degraded"
      ? "degraded"
      : "healthy";

  const sample: HealthCheckSample = {
    id: generateId("hlth"),
    checkedAt: nowIso,
    overallStatus,
    services: {
      application: { status: appStatus, latencyMs: appLatency },
      authentication: { status: authStatus, latencyMs: authLatency },
      firestore: { status: dbStatus, latencyMs: dbLatency },
      razorpay: { status: razorpayStatus, detail: razorpayDetail },
      notifications: { status: notifStatus, detail: notifDetail },
      backups: { status: backupStatus, detail: backupDetail },
    },
  };

  if (options?.persist !== false) {
    // Throttle automatic persistence to at most 1 sample per 60s
    const latestSnap = await healthChecksCol()
      .orderBy("checkedAt", "desc")
      .limit(1)
      .get()
      .catch(() => null);
    const latest = latestSnap?.docs[0]?.data();
    const shouldWrite =
      !latest || Date.now() - new Date(latest.checkedAt).getTime() >= 60_000;
    if (shouldWrite) {
      await healthChecksCol()
        .doc(sample.id)
        .set(sample)
        .catch(() => undefined);
    }
  }

  return sample;
}

export async function getEmergencyDashboardData(
  actor: SessionUser,
  options?: { range?: "24h" | "7d" | "30d" | "custom"; from?: string; to?: string }
) {
  assertSuperAdmin(actor);

  // Trigger policy reconciliation first so expired windows reflect accurately
  await evaluatePlatformPolicy({ actorRole: "institute_admin" });

  const [
    health,
    healthHistorySnap,
    maintSnap,
    lockSnap,
    restSnap,
    incSnap,
    recSnap,
    auditSnap,
    instSnap,
  ] = await Promise.all([
    runLiveHealthProbe(actor, { persist: true }),
    healthChecksCol().orderBy("checkedAt", "desc").limit(120).get(),
    maintenanceEventsCol().orderBy("createdAt", "desc").limit(50).get(),
    platformLockdownsCol().orderBy("createdAt", "desc").limit(50).get(),
    serviceRestrictionsCol().orderBy("createdAt", "desc").limit(50).get(),
    incidentsCol().orderBy("createdAt", "desc").limit(100).get(),
    recoveryOpsCol().orderBy("createdAt", "desc").limit(50).get(),
    emergencyAuditCol().orderBy("createdAt", "desc").limit(50).get(),
    institutesCollection().select("name", "code", "status").get(),
  ]);

  const maintenances = maintSnap.docs.map((d) => d.data());
  const lockdowns = lockSnap.docs.map((d) => d.data());
  const restrictions = restSnap.docs.map((d) => d.data());
  const incidents = incSnap.docs.map((d) =>
    normalizeIncidentRecord(d.data() as unknown as Record<string, unknown>)
  );
  const recoveries = recSnap.docs.map((d) => d.data());
  const audits = auditSnap.docs.map((d) => d.data());
  const institutes = instSnap.docs.map((d) => ({
    id: d.id,
    name: String(d.data().name ?? d.id),
    code: String(d.data().code ?? ""),
    status: String(d.data().status ?? "active"),
  }));

  const activeMaintenances = maintenances.filter((m) => m.status === "active");
  const activeLockdowns = lockdowns.filter((l) => l.status === "active");
  const activeRestrictions = restrictions.filter((r) => r.status === "active");
  const openIncidents = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "closed"
  );
  const criticalIncidents = openIncidents.filter((i) => i.severity === "critical");

  // Compute unique affected institutes across active maintenances, lockdowns, restrictions, open incidents
  const affectedInstSet = new Set<string>();
  let globalAffected = false;
  for (const m of activeMaintenances) {
    if (m.scope === "platform") globalAffected = true;
    m.affectedInstituteIds.forEach((id) => affectedInstSet.add(id));
  }
  for (const l of activeLockdowns) {
    if (l.type === "global") globalAffected = true;
    if (l.instituteId) affectedInstSet.add(l.instituteId);
  }
  for (const r of activeRestrictions) {
    if (r.scope === "global") globalAffected = true;
    r.instituteIds.forEach((id) => affectedInstSet.add(id));
  }
  for (const inc of openIncidents) {
    inc.affectedInstituteIds.forEach((id) => affectedInstSet.add(id));
  }

  const servicesDegradedCount = [
    health.services.application.status,
    health.services.authentication.status,
    health.services.firestore.status,
    health.services.razorpay.status,
    health.services.notifications.status,
  ].filter((s) => s === "degraded" || s === "unavailable").length;

  // Filter health history by range
  const nowMs = Date.now();
  const range = options?.range ?? "24h";
  const rangeMs =
    range === "24h"
      ? 24 * 3600_000
      : range === "7d"
        ? 7 * 24 * 3600_000
        : range === "30d"
          ? 30 * 24 * 3600_000
          : null;

  const fromMs = options?.from ? new Date(options.from).getTime() : null;
  const toMs = options?.to ? new Date(options.to).getTime() : null;

  const healthSeries = healthHistorySnap.docs
    .map((d) => d.data())
    .filter((sample) => {
      const ts = new Date(sample.checkedAt).getTime();
      if (range === "custom") {
        if (fromMs && Number.isFinite(fromMs) && ts < fromMs) return false;
        if (toMs && Number.isFinite(toMs) && ts > toMs) return false;
        return true;
      }
      return rangeMs ? nowMs - ts <= rangeMs : true;
    })
    .reverse();

  // Incident Analytics (MTTA & MTTR only from real timestamps)
  const ackDurationsMin: number[] = [];
  const resDurationsMin: number[] = [];
  for (const inc of incidents) {
    const createdMs = new Date(inc.createdAt).getTime();
    if (inc.acknowledgedAt) {
      const ackMs = new Date(inc.acknowledgedAt).getTime();
      if (Number.isFinite(ackMs) && ackMs >= createdMs) {
        ackDurationsMin.push(Math.round((ackMs - createdMs) / 60_000));
      }
    }
    if (inc.resolvedAt) {
      const resMs = new Date(inc.resolvedAt).getTime();
      if (Number.isFinite(resMs) && resMs >= createdMs) {
        resDurationsMin.push(Math.round((resMs - createdMs) / 60_000));
      }
    }
  }

  const mttaMinutes =
    ackDurationsMin.length > 0
      ? Math.round(ackDurationsMin.reduce((a, b) => a + b, 0) / ackDurationsMin.length)
      : null;
  const mttrMinutes =
    resDurationsMin.length > 0
      ? Math.round(resDurationsMin.reduce((a, b) => a + b, 0) / resDurationsMin.length)
      : null;

  const bySeverity = {
    critical: incidents.filter((i) => i.severity === "critical").length,
    high: incidents.filter((i) => i.severity === "high").length,
    medium: incidents.filter((i) => i.severity === "medium").length,
    low: incidents.filter((i) => i.severity === "low").length,
    info: incidents.filter((i) => i.severity === "info").length,
  };

  const byStatus = {
    detected: incidents.filter((i) => i.status === "detected").length,
    acknowledged: incidents.filter((i) => i.status === "acknowledged").length,
    investigating: incidents.filter((i) => i.status === "investigating").length,
    mitigating: incidents.filter((i) => i.status === "mitigating").length,
    monitoring: incidents.filter((i) => i.status === "monitoring").length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
    closed: incidents.filter((i) => i.status === "closed").length,
  };

  return {
    checkedAt: health.checkedAt,
    health,
    healthSeries,
    kpis: {
      activeIncidents: openIncidents.length,
      criticalIncidents: criticalIncidents.length,
      servicesDegraded: servicesDegradedCount,
      institutesAffected: globalAffected ? institutes.length : affectedInstSet.size,
      globalAffected,
      activeRestrictions: activeRestrictions.length,
      maintenanceEvents: activeMaintenances.length,
      scheduledMaintenances: maintenances.filter((m) => m.status === "scheduled").length,
      recoveryOperations: recoveries.length,
      failedOperations:
        recoveries.filter((r) => r.status === "failed").length +
        audits.filter((a) => a.result === "failure").length,
    },
    analytics: {
      bySeverity,
      byStatus,
      mttaMinutes,
      mttrMinutes,
      totalIncidents: incidents.length,
    },
    activeStateSummary: {
      activeMaintenances,
      activeLockdowns,
      activeRestrictions,
    },
    audits,
    institutes,
  };
}

// ============================================================================
// MODULE 2: MAINTENANCE MODE
// ============================================================================

export async function listMaintenanceEvents(actor: SessionUser) {
  assertSuperAdmin(actor);
  await evaluatePlatformPolicy({ actorRole: "institute_admin" });
  const [snap, instSnap] = await Promise.all([
    maintenanceEventsCol().orderBy("createdAt", "desc").limit(60).get(),
    institutesCollection().select("name", "code", "status").get(),
  ]);
  return {
    events: snap.docs.map((d) => d.data()),
    institutes: instSnap.docs.map((d) => ({
      id: d.id,
      name: String(d.data().name ?? d.id),
      code: String(d.data().code ?? ""),
    })),
    services: SERVICE_REGISTRY,
  };
}

export async function createOrScheduleMaintenance(
  actor: SessionUser,
  input: {
    name: string;
    description: string;
    type: MaintenanceType;
    scope: MaintenanceScope;
    affectedServices: string[];
    affectedInstituteIds: string[];
    startAt: string;
    expectedEndAt: string;
    publicMessage: string;
    internalNotes?: string | undefined;
    notifyInstitutes: boolean;
    activateImmediately: boolean;
  }
) {
  assertSuperAdmin(actor);
  const now = new Date();
  const nowIso = now.toISOString();
  const startDate = input.activateImmediately ? now : new Date(input.startAt);
  const endDate = new Date(input.expectedEndAt);

  if (Number.isNaN(endDate.getTime()) || endDate.getTime() <= startDate.getTime()) {
    throw new AuthError(
      400,
      "INVALID_WINDOW",
      "Expected end time must be after start time."
    );
  }

  const id = generateId("mnt");
  const status =
    input.activateImmediately || startDate.getTime() <= now.getTime()
      ? "active"
      : "scheduled";

  const record: MaintenanceEventRecord = {
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    type: input.type,
    scope: input.scope,
    affectedServices: input.affectedServices,
    affectedInstituteIds: input.affectedInstituteIds,
    status,
    startAt: startDate.toISOString(),
    expectedEndAt: endDate.toISOString(),
    publicMessage: input.publicMessage.trim(),
    ...(input.internalNotes?.trim() ? { internalNotes: input.internalNotes.trim() } : {}),
    notifyInstitutes: input.notifyInstitutes,
    createdByUid: actor.uid,
    updatedByUid: actor.uid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await maintenanceEventsCol().doc(id).set(record);
  await writeEmergencyAudit({
    actor,
    action: status === "active" ? "MAINTENANCE_ENABLED" : "MAINTENANCE_SCHEDULED",
    targetType: "maintenance_event",
    targetId: id,
    newState: JSON.stringify({
      status,
      scope: record.scope,
      expectedEndAt: record.expectedEndAt,
    }),
    reason: record.description,
  });

  return record;
}

export async function manageMaintenanceEvent(
  actor: SessionUser,
  input: {
    id: string;
    action: "disable" | "cancel" | "extend" | "edit";
    reason: string;
    expectedEndAt?: string;
    publicMessage?: string;
    internalNotes?: string;
  }
) {
  assertSuperAdmin(actor);
  const ref = maintenanceEventsCol().doc(input.id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!existing) {
    throw new AuthError(404, "NOT_FOUND", "Maintenance event not found.");
  }

  const nowIso = new Date().toISOString();
  const prevState = JSON.stringify({
    status: existing.status,
    expectedEndAt: existing.expectedEndAt,
  });

  if (input.action === "disable") {
    const update = {
      status: "completed" as const,
      actualEndAt: nowIso,
      updatedByUid: actor.uid,
      updatedAt: nowIso,
    };
    await ref.update(update);
    await writeEmergencyAudit({
      actor,
      action: "MAINTENANCE_DISABLED",
      targetType: "maintenance_event",
      targetId: existing.id,
      previousState: prevState,
      newState: JSON.stringify(update),
      reason: input.reason,
    });
    return { ...existing, ...update };
  }

  if (input.action === "cancel") {
    if (existing.status !== "scheduled") {
      throw new AuthError(
        400,
        "INVALID_STATE",
        "Only scheduled maintenance events can be cancelled."
      );
    }
    const update = {
      status: "cancelled" as const,
      updatedByUid: actor.uid,
      updatedAt: nowIso,
    };
    await ref.update(update);
    await writeEmergencyAudit({
      actor,
      action: "MAINTENANCE_CANCELLED",
      targetType: "maintenance_event",
      targetId: existing.id,
      previousState: prevState,
      newState: JSON.stringify(update),
      reason: input.reason,
    });
    return { ...existing, ...update };
  }

  if (!input.expectedEndAt) {
    throw new AuthError(400, "VALIDATION_ERROR", "New expected end time is required.");
  }
  const nextEnd = new Date(input.expectedEndAt);
  if (Number.isNaN(nextEnd.getTime()) || nextEnd.getTime() <= Date.now()) {
    throw new AuthError(
      400,
      "INVALID_WINDOW",
      "Expected end time must be in the future."
    );
  }

  const update = {
    expectedEndAt: nextEnd.toISOString(),
    ...(input.publicMessage ? { publicMessage: input.publicMessage.trim() } : {}),
    ...(input.internalNotes !== undefined
      ? { internalNotes: input.internalNotes.trim() }
      : {}),
    updatedByUid: actor.uid,
    updatedAt: nowIso,
  };
  await ref.update(update);
  await writeEmergencyAudit({
    actor,
    action: input.action === "extend" ? "MAINTENANCE_EXTENDED" : "MAINTENANCE_UPDATED",
    targetType: "maintenance_event",
    targetId: existing.id,
    previousState: prevState,
    newState: JSON.stringify(update),
    reason: input.reason,
  });
  return { ...existing, ...update };
}

// ============================================================================
// MODULE 3: PLATFORM LOCKDOWN
// ============================================================================

export async function listPlatformLockdowns(actor: SessionUser) {
  assertSuperAdmin(actor);
  const [lockSnap, instSnap] = await Promise.all([
    platformLockdownsCol().orderBy("createdAt", "desc").limit(50).get(),
    institutesCollection().select("name", "code", "status").get(),
  ]);
  return {
    lockdowns: lockSnap.docs.map((d) => d.data()),
    institutes: instSnap.docs.map((d) => ({
      id: d.id,
      name: String(d.data().name ?? d.id),
      code: String(d.data().code ?? ""),
      status: String(d.data().status ?? "active"),
    })),
    services: SERVICE_REGISTRY,
  };
}

export async function activatePlatformLockdown(
  actor: SessionUser,
  input: {
    type: LockdownType;
    instituteId?: string;
    restrictedServices: string[];
    reason: string;
    confirmPhrase?: string;
  }
) {
  assertSuperAdmin(actor);

  if (input.type === "global" && input.confirmPhrase !== "LOCKDOWN") {
    throw new AuthError(
      400,
      "CONFIRMATION_REQUIRED",
      'Global lockdown requires typing "LOCKDOWN" to confirm.'
    );
  }

  let instituteName: string | undefined;
  let instituteCode: string | undefined;
  if (input.type === "institute") {
    if (!input.instituteId) {
      throw new AuthError(400, "INSTITUTE_REQUIRED", "Select an institute to lock down.");
    }
    const instDoc = await institutesCollection().doc(input.instituteId).get();
    const inst = instDoc.data();
    if (!instDoc.exists || !inst) {
      throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Target institute not found.");
    }
    instituteName = inst.name;
    instituteCode = inst.code;
  }

  const nowIso = new Date().toISOString();
  const id = generateId("lck");
  const record: PlatformLockdownRecord = {
    id,
    type: input.type,
    scope: input.type === "institute" ? "institute" : "platform",
    ...(input.instituteId ? { instituteId: input.instituteId } : {}),
    ...(instituteName ? { instituteName } : {}),
    ...(instituteCode ? { instituteCode } : {}),
    restrictedServices: input.restrictedServices,
    status: "active",
    reason: input.reason.trim(),
    exemptSuperAdminUids: [actor.uid],
    activatedAt: nowIso,
    createdByUid: actor.uid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await platformLockdownsCol().doc(id).set(record);
  const verifiedSnap = await platformLockdownsCol().doc(id).get();
  if (!verifiedSnap.exists || verifiedSnap.data()?.status !== "active") {
    throw new AuthError(
      500,
      "VERIFICATION_FAILED",
      "Lockdown state verification failed."
    );
  }

  await writeEmergencyAudit({
    actor,
    action: "PLATFORM_LOCKDOWN_ACTIVATED",
    targetType: "platform_lockdown",
    targetId: id,
    newState: JSON.stringify({
      type: record.type,
      scope: record.scope,
      instituteId: record.instituteId ?? null,
    }),
    reason: record.reason,
  });

  return record;
}

export async function releasePlatformLockdown(
  actor: SessionUser,
  input: { id: string; reason: string }
) {
  assertSuperAdmin(actor);
  const ref = platformLockdownsCol().doc(input.id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!existing) {
    throw new AuthError(404, "NOT_FOUND", "Lockdown record not found.");
  }
  if (existing.status === "released") {
    return existing;
  }

  const nowIso = new Date().toISOString();
  const update = {
    status: "released" as const,
    releasedAt: nowIso,
    releasedByUid: actor.uid,
    releaseReason: input.reason.trim(),
    updatedAt: nowIso,
  };

  await ref.update(update);
  await writeEmergencyAudit({
    actor,
    action: "PLATFORM_LOCKDOWN_RELEASED",
    targetType: "platform_lockdown",
    targetId: existing.id,
    previousState: JSON.stringify({ status: existing.status }),
    newState: JSON.stringify({ status: "released" }),
    reason: input.reason.trim(),
  });

  return { ...existing, ...update };
}

// ============================================================================
// MODULE 4: SERVICE RESTRICTIONS
// ============================================================================

export async function listServiceRestrictions(actor: SessionUser) {
  assertSuperAdmin(actor);
  await evaluatePlatformPolicy({ actorRole: "institute_admin" });

  const [restSnap, instSnap] = await Promise.all([
    serviceRestrictionsCol().orderBy("createdAt", "desc").limit(100).get(),
    institutesCollection().select("name", "code").get(),
  ]);

  const restrictions = restSnap.docs.map((d) => d.data());
  const services = SERVICE_REGISTRY.map((svc) => {
    const activeForService = restrictions.filter(
      (r) => r.serviceId === svc.id && r.status === "active"
    );
    const effectiveStatus: "operational" | "read_only" | "restricted" =
      activeForService.length === 0
        ? "operational"
        : activeForService.some((r) => r.restrictionType === "read_only")
          ? "read_only"
          : "restricted";
    return {
      ...svc,
      activeRestrictions: activeForService,
      effectiveStatus,
    };
  });

  return {
    services,
    restrictions,
    institutes: instSnap.docs.map((d) => ({
      id: d.id,
      name: String(d.data().name ?? d.id),
      code: String(d.data().code ?? ""),
    })),
  };
}

export async function createServiceRestriction(
  actor: SessionUser,
  input: {
    serviceId: string;
    restrictionType: RestrictionType;
    scope: "global" | "institute";
    instituteIds: string[];
    disabledOperations: string[];
    reason: string;
    userMessage: string;
    internalNotes?: string;
    startAt?: string;
    expiresAt?: string;
  }
) {
  assertSuperAdmin(actor);
  const serviceExists = SERVICE_REGISTRY.some((s) => s.id === input.serviceId);
  if (!serviceExists) {
    throw new AuthError(400, "INVALID_SERVICE", "Selected service is not in registry.");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const startDate = input.startAt ? new Date(input.startAt) : now;
  const status = startDate.getTime() > now.getTime() ? "scheduled" : "active";

  const id = generateId("rst");
  const record: ServiceRestrictionRecord = {
    id,
    serviceId: input.serviceId,
    restrictionType: input.restrictionType,
    scope: input.scope,
    instituteIds: input.scope === "institute" ? input.instituteIds : [],
    disabledOperations: input.disabledOperations,
    status,
    reason: input.reason.trim(),
    userMessage: input.userMessage.trim(),
    ...(input.internalNotes?.trim() ? { internalNotes: input.internalNotes.trim() } : {}),
    startAt: startDate.toISOString(),
    ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt).toISOString() } : {}),
    createdByUid: actor.uid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await serviceRestrictionsCol().doc(id).set(record);
  await writeEmergencyAudit({
    actor,
    action: "SERVICE_RESTRICTION_CREATED",
    targetType: "service_restriction",
    targetId: id,
    newState: JSON.stringify({
      serviceId: record.serviceId,
      restrictionType: record.restrictionType,
      scope: record.scope,
    }),
    reason: record.reason,
  });

  return record;
}

export async function restoreServiceRestriction(
  actor: SessionUser,
  input: { id: string; reason: string }
) {
  assertSuperAdmin(actor);
  const ref = serviceRestrictionsCol().doc(input.id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!existing) {
    throw new AuthError(404, "NOT_FOUND", "Service restriction not found.");
  }
  if (existing.status === "restored" || existing.status === "expired") {
    return existing;
  }

  const nowIso = new Date().toISOString();
  const update = {
    status: "restored" as const,
    restoredAt: nowIso,
    restoredByUid: actor.uid,
    updatedAt: nowIso,
  };
  await ref.update(update);
  await writeEmergencyAudit({
    actor,
    action: "SERVICE_RESTRICTION_RESTORED",
    targetType: "service_restriction",
    targetId: existing.id,
    previousState: JSON.stringify({ status: existing.status }),
    newState: JSON.stringify({ status: "restored" }),
    reason: input.reason.trim(),
  });

  return { ...existing, ...update };
}

// ============================================================================
// MODULE 5: INCIDENT MANAGEMENT
// ============================================================================

export async function listEnterpriseIncidents(actor: SessionUser) {
  assertSuperAdmin(actor);
  const [incSnap, instSnap, suSnap] = await Promise.all([
    incidentsCol().orderBy("createdAt", "desc").limit(100).get(),
    institutesCollection().select("name", "code").get(),
    usersCollection()
      .where("role", "==", "super_admin")
      .select("email", "displayName")
      .get(),
  ]);

  const incidents = incSnap.docs.map((d) =>
    normalizeIncidentRecord(d.data() as unknown as Record<string, unknown>)
  );

  return {
    incidents,
    services: SERVICE_REGISTRY,
    institutes: instSnap.docs.map((d) => ({
      id: d.id,
      name: String(d.data().name ?? d.id),
      code: String(d.data().code ?? ""),
    })),
    operators: suSnap.docs.map((d) => ({
      uid: d.id,
      email: String(d.data().email ?? d.id),
      displayName: String(d.data().displayName ?? d.data().email ?? d.id),
    })),
  };
}

export async function getEnterpriseIncidentDetail(actor: SessionUser, id: string) {
  assertSuperAdmin(actor);
  const [incSnap, commentsSnap, allIncSnap, instSnap, suSnap] = await Promise.all([
    incidentsCol().doc(id).get(),
    incidentCommentsCol()
      .where("incidentId", "==", id)
      .orderBy("createdAt", "asc")
      .get()
      .catch(async () => {
        // Fallback if composite index is still building
        const s = await incidentCommentsCol().where("incidentId", "==", id).get();
        return s;
      }),
    incidentsCol().orderBy("createdAt", "desc").limit(30).get(),
    institutesCollection().select("name", "code").get(),
    usersCollection()
      .where("role", "==", "super_admin")
      .select("email", "displayName")
      .get(),
  ]);

  if (!incSnap.exists || !incSnap.data()) {
    throw new AuthError(404, "INCIDENT_NOT_FOUND", "Incident not found.");
  }

  const incident = normalizeIncidentRecord(
    incSnap.data() as unknown as Record<string, unknown>
  );
  const comments = commentsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    incident,
    comments,
    allIncidents: allIncSnap.docs
      .map((d) => normalizeIncidentRecord(d.data() as unknown as Record<string, unknown>))
      .filter((i) => i.id !== id),
    institutes: instSnap.docs.map((d) => ({
      id: d.id,
      name: String(d.data().name ?? d.id),
      code: String(d.data().code ?? ""),
    })),
    operators: suSnap.docs.map((d) => ({
      uid: d.id,
      email: String(d.data().email ?? d.id),
      displayName: String(d.data().displayName ?? d.data().email ?? d.id),
    })),
  };
}

export async function createEnterpriseIncident(
  actor: SessionUser,
  input: {
    title: string;
    description: string;
    category: IncidentCategory;
    severity: EnterpriseIncidentSeverity;
    affectedServices: string[];
    affectedInstituteIds: string[];
    detectionSource: string;
    assignedToUid?: string | undefined;
    impactDescription?: string | undefined;
    internalNotes?: string | undefined;
    initialStatus?: "detected" | "acknowledged" | "investigating" | undefined;
  }
) {
  assertSuperAdmin(actor);
  const id = generateId("inc");
  const nowIso = new Date().toISOString();
  const status = input.initialStatus ?? "detected";

  const record: IncidentRecord = {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    severity: input.severity,
    status,
    affectedServices: input.affectedServices,
    affectedInstituteIds: input.affectedInstituteIds,
    detectionSource: input.detectionSource.trim(),
    reportedByUid: actor.uid,
    ...(input.assignedToUid ? { assignedToUid: input.assignedToUid } : {}),
    ...(input.impactDescription?.trim()
      ? { impactDescription: input.impactDescription.trim() }
      : {}),
    ...(input.internalNotes?.trim() ? { internalNotes: input.internalNotes.trim() } : {}),
    relatedIncidentIds: [],
    ...(status === "acknowledged" || status === "investigating"
      ? { acknowledgedAt: nowIso }
      : {}),
    createdByUid: actor.uid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const commentId = generateId("icmt");
  const initialComment: IncidentCommentRecord = {
    id: commentId,
    incidentId: id,
    type: "status_change",
    body: `Incident declared with severity ${record.severity.toUpperCase()} (${status}).`,
    actorUid: actor.uid,
    actorEmail: actor.email,
    createdAt: nowIso,
  };

  await Promise.all([
    incidentsCol().doc(id).set(record),
    incidentCommentsCol().doc(commentId).set(initialComment),
  ]);

  await writeEmergencyAudit({
    actor,
    action: "INCIDENT_CREATED",
    targetType: "incident",
    targetId: id,
    newState: JSON.stringify({ severity: record.severity, status: record.status }),
    reason: record.title,
  });

  return record;
}

export async function updateEnterpriseIncident(
  actor: SessionUser,
  input: {
    id: string;
    action:
      | "transition_status"
      | "assign"
      | "change_severity"
      | "add_comment"
      | "link_incident";
    status?: EnterpriseIncidentStatus | undefined;
    assignedToUid?: string | undefined;
    severity?: EnterpriseIncidentSeverity | undefined;
    comment?: string | undefined;
    commentType?: "comment" | "evidence" | undefined;
    resolutionSummary?: string | undefined;
    relatedIncidentId?: string | undefined;
    reason?: string | undefined;
  }
) {
  assertSuperAdmin(actor);
  const ref = incidentsCol().doc(input.id);
  const snap = await ref.get();
  if (!snap.exists || !snap.data()) {
    throw new AuthError(404, "INCIDENT_NOT_FOUND", "Incident not found.");
  }

  const existing = normalizeIncidentRecord(
    snap.data() as unknown as Record<string, unknown>
  );
  const nowIso = new Date().toISOString();

  if (input.action === "transition_status") {
    if (!input.status) {
      throw new AuthError(400, "VALIDATION_ERROR", "Target status is required.");
    }
    const allowed = INCIDENT_TRANSITIONS[existing.status] ?? [];
    if (input.status !== existing.status && !allowed.includes(input.status)) {
      throw new AuthError(
        400,
        "INVALID_TRANSITION",
        `Cannot transition from ${existing.status} to ${input.status}.`
      );
    }

    const patch: Partial<IncidentRecord> = {
      status: input.status,
      updatedAt: nowIso,
      ...(input.status === "acknowledged" && !existing.acknowledgedAt
        ? { acknowledgedAt: nowIso }
        : {}),
      ...(input.status === "resolved" ? { resolvedAt: nowIso } : {}),
      ...(input.status === "closed" ? { closedAt: nowIso } : {}),
      ...(input.resolutionSummary
        ? { resolutionSummary: input.resolutionSummary.trim() }
        : {}),
    };

    const commentId = generateId("icmt");
    await Promise.all([
      ref.update(patch),
      incidentCommentsCol()
        .doc(commentId)
        .set({
          id: commentId,
          incidentId: existing.id,
          type: "status_change",
          body: `Status changed from ${existing.status} to ${input.status}.${input.reason ? ` Note: ${input.reason}` : ""}`,
          actorUid: actor.uid,
          actorEmail: actor.email,
          createdAt: nowIso,
        }),
    ]);

    await writeEmergencyAudit({
      actor,
      action: "INCIDENT_STATUS_CHANGED",
      targetType: "incident",
      targetId: existing.id,
      previousState: existing.status,
      newState: input.status,
      reason: input.reason || `Transitioned to ${input.status}`,
    });

    return { ...existing, ...patch };
  }

  if (input.action === "assign") {
    const patch = { assignedToUid: input.assignedToUid ?? actor.uid, updatedAt: nowIso };
    const commentId = generateId("icmt");
    await Promise.all([
      ref.update(patch),
      incidentCommentsCol()
        .doc(commentId)
        .set({
          id: commentId,
          incidentId: existing.id,
          type: "assignment",
          body: `Incident assigned to operator ${patch.assignedToUid}.`,
          actorUid: actor.uid,
          actorEmail: actor.email,
          createdAt: nowIso,
        }),
    ]);
    await writeEmergencyAudit({
      actor,
      action: "INCIDENT_ASSIGNED",
      targetType: "incident",
      targetId: existing.id,
      newState: patch.assignedToUid,
      reason: "Operator assignment updated",
    });
    return { ...existing, ...patch };
  }

  if (input.action === "change_severity") {
    if (!input.severity) {
      throw new AuthError(400, "VALIDATION_ERROR", "Severity is required.");
    }
    const patch = { severity: input.severity, updatedAt: nowIso };
    const commentId = generateId("icmt");
    await Promise.all([
      ref.update(patch),
      incidentCommentsCol()
        .doc(commentId)
        .set({
          id: commentId,
          incidentId: existing.id,
          type: "severity_change",
          body: `Severity changed from ${existing.severity.toUpperCase()} to ${input.severity.toUpperCase()}.${input.reason ? ` Reason: ${input.reason}` : ""}`,
          actorUid: actor.uid,
          actorEmail: actor.email,
          createdAt: nowIso,
        }),
    ]);
    await writeEmergencyAudit({
      actor,
      action: "INCIDENT_SEVERITY_CHANGED",
      targetType: "incident",
      targetId: existing.id,
      previousState: existing.severity,
      newState: input.severity,
      reason: input.reason || "Severity updated",
    });
    return { ...existing, ...patch };
  }

  if (input.action === "link_incident" && input.relatedIncidentId) {
    const nextRelated = Array.from(
      new Set([...existing.relatedIncidentIds, input.relatedIncidentId])
    );
    await ref.update({ relatedIncidentIds: nextRelated, updatedAt: nowIso });
    return { ...existing, relatedIncidentIds: nextRelated, updatedAt: nowIso };
  }

  if (input.action === "add_comment" && input.comment?.trim()) {
    const commentId = generateId("icmt");
    const comment: IncidentCommentRecord = {
      id: commentId,
      incidentId: existing.id,
      type: input.commentType ?? "comment",
      body: input.comment.trim(),
      actorUid: actor.uid,
      actorEmail: actor.email,
      createdAt: nowIso,
    };
    await Promise.all([
      incidentCommentsCol().doc(commentId).set(comment),
      ref.update({ updatedAt: nowIso }),
    ]);
    return existing;
  }

  throw new AuthError(400, "INVALID_ACTION", "Unsupported incident action.");
}

// ============================================================================
// MODULE 6: RECOVERY OPERATIONS
// ============================================================================

export async function getRecoveryOverview(actor: SessionUser) {
  assertSuperAdmin(actor);
  const [recSnap, stepsSnap, health, maintSnap, lockSnap, restSnap, incSnap] =
    await Promise.all([
      recoveryOpsCol().orderBy("createdAt", "desc").limit(50).get(),
      recoveryStepsCol().orderBy("executedAt", "desc").limit(100).get(),
      runLiveHealthProbe(actor, { persist: false }),
      maintenanceEventsCol().where("status", "==", "active").get(),
      platformLockdownsCol().where("status", "==", "active").get(),
      serviceRestrictionsCol().where("status", "==", "active").get(),
      incidentsCol().orderBy("createdAt", "desc").limit(40).get(),
    ]);

  const backupBucket = process.env.FIREBASE_BACKUP_BUCKET?.trim();

  return {
    operations: recSnap.docs.map((d) => d.data()),
    steps: stepsSnap.docs.map((d) => d.data()),
    health,
    activeMaintenances: maintSnap.docs.map((d) => d.data()),
    activeLockdowns: lockSnap.docs.map((d) => d.data()),
    activeRestrictions: restSnap.docs.map((d) => d.data()),
    incidents: incSnap.docs.map((d) =>
      normalizeIncidentRecord(d.data() as unknown as Record<string, unknown>)
    ),
    services: SERVICE_REGISTRY,
    backupConfig: {
      configured: Boolean(backupBucket),
      provider: backupBucket ? "Google Cloud Firestore Export" : "Not Configured",
      bucketReference: backupBucket ? `${backupBucket.slice(0, 6)}***` : null,
      status: backupBucket ? "Configured" : "Not Configured",
    },
  };
}

export async function createRecoveryAssessment(
  actor: SessionUser,
  input: {
    relatedIncidentId?: string;
    recoveryType: RecoveryType;
    targetServiceId?: string;
    targetInstituteId?: string;
    targetResourceId?: string;
    objective: string;
    impactAssessment: string;
    priority: "p1" | "p2" | "p3";
    internalNotes?: string;
  }
) {
  assertSuperAdmin(actor);
  const id = generateId("rcv");
  const nowIso = new Date().toISOString();
  const requiresApproval =
    input.recoveryType === "release_lockdown" || input.priority === "p1";

  const record: RecoveryOperationRecord = {
    id,
    ...(input.relatedIncidentId ? { relatedIncidentId: input.relatedIncidentId } : {}),
    recoveryType: input.recoveryType,
    ...(input.targetServiceId ? { targetServiceId: input.targetServiceId } : {}),
    ...(input.targetInstituteId ? { targetInstituteId: input.targetInstituteId } : {}),
    ...(input.targetResourceId ? { targetResourceId: input.targetResourceId } : {}),
    objective: input.objective.trim(),
    impactAssessment: input.impactAssessment.trim(),
    priority: input.priority,
    requiresApproval,
    assignedToUid: actor.uid,
    status: requiresApproval ? "assessed" : "approved",
    ...(input.internalNotes?.trim() ? { internalNotes: input.internalNotes.trim() } : {}),
    createdByUid: actor.uid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await recoveryOpsCol().doc(id).set(record);
  await writeEmergencyAudit({
    actor,
    action: "RECOVERY_ASSESSMENT_CREATED",
    targetType: "recovery_operation",
    targetId: id,
    newState: JSON.stringify({
      recoveryType: record.recoveryType,
      status: record.status,
    }),
    reason: record.objective,
  });

  return record;
}

export async function approveRecoveryOperation(actor: SessionUser, id: string) {
  assertSuperAdmin(actor);
  const ref = recoveryOpsCol().doc(id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!existing) {
    throw new AuthError(404, "NOT_FOUND", "Recovery operation not found.");
  }

  const nowIso = new Date().toISOString();
  const update = {
    status: "approved" as const,
    approvedByUid: actor.uid,
    approvedAt: nowIso,
    updatedAt: nowIso,
  };
  await ref.update(update);
  await writeEmergencyAudit({
    actor,
    action: "RECOVERY_APPROVED",
    targetType: "recovery_operation",
    targetId: id,
    previousState: existing.status,
    newState: "approved",
    reason: "Operator approved recovery execution",
  });
  return { ...existing, ...update };
}

export async function executeRecoveryOperation(
  actor: SessionUser,
  input: { id: string; reason: string }
) {
  assertSuperAdmin(actor);
  const ref = recoveryOpsCol().doc(input.id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!existing) {
    throw new AuthError(404, "NOT_FOUND", "Recovery operation not found.");
  }
  if (existing.requiresApproval && existing.status !== "approved") {
    throw new AuthError(
      400,
      "APPROVAL_REQUIRED",
      "This recovery operation requires approval before execution."
    );
  }

  const startedAt = new Date().toISOString();
  await ref.update({ status: "executing", startedAt, updatedAt: startedAt });

  const recordStep = async (
    stepOrder: number,
    label: string,
    status: "completed" | "failed",
    detail: string
  ) => {
    const stepId = generateId("rstp");
    await recoveryStepsCol().doc(stepId).set({
      id: stepId,
      recoveryId: existing.id,
      stepOrder,
      label,
      status,
      detail,
      executedAt: new Date().toISOString(),
    });
  };

  try {
    await recordStep(
      1,
      "Validate prerequisites & operator authorization",
      "completed",
      `Verified Super Admin ${actor.uid}`
    );

    let verificationResult = "";

    if (existing.recoveryType === "end_maintenance") {
      if (!existing.targetResourceId) {
        throw new Error("Target maintenance event ID is required.");
      }
      await manageMaintenanceEvent(actor, {
        id: existing.targetResourceId,
        action: "disable",
        reason: input.reason,
      });
      await recordStep(
        2,
        "Disable active maintenance window",
        "completed",
        `Ended maintenance ${existing.targetResourceId}`
      );
      const health = await runLiveHealthProbe(actor, { persist: true });
      verificationResult = `Post-maintenance health: ${health.overallStatus}`;
      await recordStep(
        3,
        "Verify platform availability",
        "completed",
        verificationResult
      );
    } else if (existing.recoveryType === "release_lockdown") {
      if (!existing.targetResourceId) {
        throw new Error("Target lockdown ID is required.");
      }
      await releasePlatformLockdown(actor, {
        id: existing.targetResourceId,
        reason: input.reason,
      });
      await recordStep(
        2,
        "Release active platform lockdown",
        "completed",
        `Released lockdown ${existing.targetResourceId}`
      );
      const health = await runLiveHealthProbe(actor, { persist: true });
      verificationResult = `Lockdown released. Core health: ${health.overallStatus}`;
      await recordStep(3, "Verify portal access", "completed", verificationResult);
    } else if (existing.recoveryType === "restore_service") {
      if (!existing.targetResourceId) {
        throw new Error("Target restriction ID is required.");
      }
      await restoreServiceRestriction(actor, {
        id: existing.targetResourceId,
        reason: input.reason,
      });
      await recordStep(
        2,
        "Restore restricted service",
        "completed",
        `Restored restriction ${existing.targetResourceId}`
      );
      const policy = await evaluatePlatformPolicy({
        serviceId: existing.targetServiceId,
        actorRole: "institute_admin",
      });
      if (policy.blocked && policy.restrictionId === existing.targetResourceId) {
        throw new Error("Verification failed: restriction still active.");
      }
      verificationResult = `Service policy verified (${policy.blocked ? "other policy remains" : "operational"}).`;
      await recordStep(
        3,
        "Verify restored service policy",
        "completed",
        verificationResult
      );
    } else {
      // Live verification workflows: verify_auth, verify_firestore, verify_app_health, verify_razorpay
      const health = await runLiveHealthProbe(actor, { persist: true });
      const svcMap = {
        verify_auth: health.services.authentication.status,
        verify_firestore: health.services.firestore.status,
        verify_app_health: health.services.application.status,
        verify_razorpay: health.services.razorpay.status,
      };
      const targetStatus = svcMap[existing.recoveryType];
      const ok = targetStatus === "healthy";
      verificationResult = `Live probe result for ${existing.recoveryType}: ${targetStatus}`;
      await recordStep(
        2,
        `Execute live probe (${existing.recoveryType})`,
        ok ? "completed" : "failed",
        verificationResult
      );
      if (!ok) {
        throw new Error(verificationResult);
      }
    }

    const completedAt = new Date().toISOString();
    await ref.update({
      status: "completed",
      verificationResult,
      completedAt,
      updatedAt: completedAt,
    });
    await writeEmergencyAudit({
      actor,
      action: "RECOVERY_EXECUTED",
      targetType: "recovery_operation",
      targetId: existing.id,
      previousState: existing.status,
      newState: "completed",
      reason: input.reason,
      result: "success",
    });

    return {
      ...existing,
      status: "completed" as const,
      verificationResult,
      startedAt,
      completedAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Recovery execution failed.";
    const failedAt = new Date().toISOString();
    await recordStep(99, "Recovery verification failed", "failed", msg);
    await ref.update({
      status: "failed",
      verificationResult: msg,
      completedAt: failedAt,
      updatedAt: failedAt,
    });
    await writeEmergencyAudit({
      actor,
      action: "RECOVERY_FAILED",
      targetType: "recovery_operation",
      targetId: existing.id,
      previousState: existing.status,
      newState: "failed",
      reason: `${input.reason} (${msg})`,
      result: "failure",
    });
    throw new AuthError(500, "RECOVERY_FAILED", msg);
  }
}
