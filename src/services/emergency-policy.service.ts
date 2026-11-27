import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { AuthError } from "@/lib/security/session";
import {
  resolveActiveEmergencyState,
  type EmergencyControlState,
} from "./emergency.service";
import type {
  MaintenanceEventRecord,
  PlatformLockdownRecord,
  PolicyEvaluationResult,
  ServiceRestrictionRecord,
} from "@/types/emergency";
import type { UserRole } from "@/types/auth";

export const EMERGENCY_COLLECTIONS = {
  MAINTENANCE_EVENTS: "maintenance_events",
  PLATFORM_LOCKDOWNS: "platform_lockdowns",
  SERVICE_RESTRICTIONS: "service_restrictions",
  INCIDENTS: "platformIncidents",
  INCIDENT_COMMENTS: "incident_comments",
  RECOVERY_OPERATIONS: "recovery_operations",
  RECOVERY_STEPS: "recovery_steps",
  HEALTH_CHECKS: "operational_health_checks",
  EMERGENCY_AUDIT: "emergency_audit_logs",
} as const;

export function maintenanceEventsCol() {
  return getAdminFirestore().collection(
    EMERGENCY_COLLECTIONS.MAINTENANCE_EVENTS
  ) as CollectionReference<MaintenanceEventRecord>;
}

export function platformLockdownsCol() {
  return getAdminFirestore().collection(
    EMERGENCY_COLLECTIONS.PLATFORM_LOCKDOWNS
  ) as CollectionReference<PlatformLockdownRecord>;
}

export function serviceRestrictionsCol() {
  return getAdminFirestore().collection(
    EMERGENCY_COLLECTIONS.SERVICE_RESTRICTIONS
  ) as CollectionReference<ServiceRestrictionRecord>;
}

export interface PolicyEvaluationContext {
  serviceId?: string | undefined;
  instituteId?: string | null | undefined;
  operation?: string | undefined;
  isWrite?: boolean | undefined;
  actorRole?: UserRole | "public" | undefined;
  now?: Date | undefined;
}

/**
 * Pure policy evaluation helper (used both in server enforcement and unit tests).
 * Super Admin is always exempted from lockouts so recovery remains accessible.
 */
export function evaluateEmergencyPolicyPure(
  input: {
    legacyState: EmergencyControlState | null;
    maintenances: MaintenanceEventRecord[];
    lockdowns: PlatformLockdownRecord[];
    restrictions: ServiceRestrictionRecord[];
  },
  ctx: PolicyEvaluationContext
): PolicyEvaluationResult {
  const now = ctx.now ?? new Date();
  const nowMs = now.getTime();

  // Never block Super Admin recovery access
  if (ctx.actorRole === "super_admin") {
    return {
      blocked: false,
      code: null,
      httpStatus: 200,
      message: "Super Admin emergency exemption active.",
    };
  }

  // 1. Check active or due scheduled Maintenance Events
  for (const m of input.maintenances) {
    if (m.status === "cancelled" || m.status === "completed") continue;
    const startMs = new Date(m.startAt).getTime();
    const endMs = new Date(m.expectedEndAt).getTime();
    const isWithinWindow =
      m.status === "active"
        ? !Number.isFinite(endMs) || endMs > nowMs
        : m.status === "scheduled" && startMs <= nowMs && endMs > nowMs;
    if (!isWithinWindow) continue;

    const matchesScope =
      m.scope === "platform" ||
      (m.scope === "services" &&
        ctx.serviceId !== undefined &&
        m.affectedServices.includes(ctx.serviceId)) ||
      (m.scope === "institutes" &&
        ctx.instituteId !== undefined &&
        ctx.instituteId !== null &&
        m.affectedInstituteIds.includes(ctx.instituteId));

    if (matchesScope) {
      return {
        blocked: true,
        code: "MAINTENANCE_ACTIVE",
        httpStatus: 503,
        message:
          m.publicMessage ||
          "CertiDesk Pro is currently undergoing scheduled maintenance.",
        expectedEndAt: m.expectedEndAt,
        maintenanceEventId: m.id,
      };
    }
  }

  // 2. Check active Platform Lockdowns
  for (const l of input.lockdowns) {
    if (l.status !== "active") continue;

    if (l.type === "global") {
      return {
        blocked: true,
        code: "LOCKDOWN_ACTIVE",
        httpStatus: 423,
        message: `Platform emergency lockdown is active: ${l.reason}`,
        lockdownId: l.id,
      };
    }

    if (l.type === "institute" && ctx.instituteId && l.instituteId === ctx.instituteId) {
      const serviceBlocked =
        l.restrictedServices.length === 0 ||
        (ctx.serviceId !== undefined && l.restrictedServices.includes(ctx.serviceId));
      if (serviceBlocked) {
        return {
          blocked: true,
          code: "LOCKDOWN_ACTIVE",
          httpStatus: 423,
          message: `Institute workspace is temporarily locked: ${l.reason}`,
          lockdownId: l.id,
        };
      }
    }

    if (l.type === "authentication" && ctx.serviceId === "authentication") {
      return {
        blocked: true,
        code: "LOCKDOWN_ACTIVE",
        httpStatus: 423,
        message: `Authentication is temporarily locked: ${l.reason}`,
        lockdownId: l.id,
      };
    }

    if (l.type === "api_write" && ctx.isWrite) {
      return {
        blocked: true,
        code: "READ_ONLY_MODE",
        httpStatus: 423,
        message: `Platform is in emergency read-only write-freeze: ${l.reason}`,
        lockdownId: l.id,
      };
    }

    if (
      l.type === "admin_actions" &&
      ctx.isWrite &&
      (ctx.actorRole === "institute_admin" || ctx.actorRole === "staff")
    ) {
      return {
        blocked: true,
        code: "LOCKDOWN_ACTIVE",
        httpStatus: 423,
        message: `Administrative write actions are temporarily restricted: ${l.reason}`,
        lockdownId: l.id,
      };
    }
  }

  // 3. Check granular Service Restrictions (with auto-expiry check)
  for (const r of input.restrictions) {
    if (r.status === "restored" || r.status === "expired") continue;
    const startMs = new Date(r.startAt).getTime();
    const expMs = r.expiresAt ? new Date(r.expiresAt).getTime() : Infinity;

    const isCurrentlyEffective =
      r.status === "active"
        ? expMs > nowMs
        : r.status === "scheduled" && startMs <= nowMs && expMs > nowMs;
    if (!isCurrentlyEffective) continue;

    if (ctx.serviceId && r.serviceId !== ctx.serviceId) continue;
    if (
      r.scope === "institute" &&
      (!ctx.instituteId || !r.instituteIds.includes(ctx.instituteId))
    ) {
      continue;
    }

    if (r.restrictionType === "read_only") {
      if (ctx.isWrite) {
        return {
          blocked: true,
          code: "READ_ONLY_MODE",
          httpStatus: 423,
          message:
            r.userMessage || `${r.serviceId} is currently in read-only mode: ${r.reason}`,
          restrictionId: r.id,
        };
      }
      continue;
    }

    if (r.restrictionType === "operation_disable") {
      if (ctx.operation && r.disabledOperations.includes(ctx.operation)) {
        return {
          blocked: true,
          code: "SERVICE_RESTRICTED",
          httpStatus: 503,
          message:
            r.userMessage ||
            `Operation "${ctx.operation}" is temporarily restricted: ${r.reason}`,
          restrictionId: r.id,
        };
      }
      continue;
    }

    // global_disable, institute_disable, temporary, scheduled
    return {
      blocked: true,
      code: "SERVICE_RESTRICTED",
      httpStatus: 503,
      message:
        r.userMessage ||
        `Service "${r.serviceId}" is temporarily unavailable: ${r.reason}`,
      restrictionId: r.id,
    };
  }

  // 4. Backward-compatible legacy platform_config/emergency_state check
  const legacy = resolveActiveEmergencyState(input.legacyState, now).flags;
  if (legacy.maintenanceMode) {
    return {
      blocked: true,
      code: "MAINTENANCE_ACTIVE",
      httpStatus: 503,
      message: "Platform maintenance mode is currently active.",
    };
  }
  if (legacy.readOnlyMode && ctx.isWrite) {
    return {
      blocked: true,
      code: "READ_ONLY_MODE",
      httpStatus: 423,
      message: "Platform is in read-only lockdown mode. Modifications are paused.",
    };
  }
  if (legacy.registrationPaused && ctx.serviceId === "admissions" && ctx.isWrite) {
    return {
      blocked: true,
      code: "SERVICE_RESTRICTED",
      httpStatus: 503,
      message: "New admissions and registrations are temporarily paused.",
    };
  }
  if (legacy.paymentsPaused && ctx.serviceId === "payments_razorpay" && ctx.isWrite) {
    return {
      blocked: true,
      code: "SERVICE_RESTRICTED",
      httpStatus: 503,
      message: "Payment checkout and wallet recharges are temporarily paused.",
    };
  }
  if (legacy.certificatesPaused && ctx.serviceId === "certificates" && ctx.isWrite) {
    return {
      blocked: true,
      code: "SERVICE_RESTRICTED",
      httpStatus: 503,
      message: "Certificate issuance is temporarily paused.",
    };
  }

  return {
    blocked: false,
    code: null,
    httpStatus: 200,
    message: "Allowed",
  };
}

/**
 * Reconciles due scheduled activations and expired windows in Firestore,
 * then evaluates the active platform policy.
 */
export async function evaluatePlatformPolicy(
  ctx: PolicyEvaluationContext
): Promise<PolicyEvaluationResult> {
  const now = ctx.now ?? new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  try {
    const [legacyDoc, maintSnap, lockSnap, restSnap] = await Promise.all([
      getAdminFirestore().collection("platform_config").doc("emergency_state").get(),
      maintenanceEventsCol().where("status", "in", ["active", "scheduled"]).get(),
      platformLockdownsCol().where("status", "==", "active").get(),
      serviceRestrictionsCol().where("status", "in", ["active", "scheduled"]).get(),
    ]);

    const maintenances = maintSnap.docs.map((d) => d.data());
    const lockdowns = lockSnap.docs.map((d) => d.data());
    const restrictions = restSnap.docs.map((d) => d.data());

    // Auto-transition scheduled/expired maintenance & restrictions server-side
    const updates: Promise<unknown>[] = [];
    for (const m of maintenances) {
      const startMs = new Date(m.startAt).getTime();
      const endMs = new Date(m.expectedEndAt).getTime();
      if (m.status === "scheduled" && startMs <= nowMs && endMs > nowMs) {
        m.status = "active";
        updates.push(
          maintenanceEventsCol().doc(m.id).update({ status: "active", updatedAt: nowIso })
        );
      } else if (
        (m.status === "active" || m.status === "scheduled") &&
        Number.isFinite(endMs) &&
        endMs <= nowMs
      ) {
        m.status = "completed";
        updates.push(
          maintenanceEventsCol()
            .doc(m.id)
            .update({ status: "completed", actualEndAt: nowIso, updatedAt: nowIso })
        );
      }
    }

    for (const r of restrictions) {
      const startMs = new Date(r.startAt).getTime();
      const expMs = r.expiresAt ? new Date(r.expiresAt).getTime() : Infinity;
      if (r.status === "scheduled" && startMs <= nowMs && expMs > nowMs) {
        r.status = "active";
        updates.push(
          serviceRestrictionsCol()
            .doc(r.id)
            .update({ status: "active", updatedAt: nowIso })
        );
      } else if (
        (r.status === "active" || r.status === "scheduled") &&
        Number.isFinite(expMs) &&
        expMs <= nowMs
      ) {
        r.status = "expired";
        updates.push(
          serviceRestrictionsCol()
            .doc(r.id)
            .update({ status: "expired", restoredAt: nowIso, updatedAt: nowIso })
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates).catch(() => undefined);
    }

    const legacyState = (legacyDoc.data() as EmergencyControlState | undefined) ?? null;

    return evaluateEmergencyPolicyPure(
      { legacyState, maintenances, lockdowns, restrictions },
      ctx
    );
  } catch {
    // Fail-open only if policy storage itself is unreachable so Super Admin/auth is never bricked
    return {
      blocked: false,
      code: null,
      httpStatus: 200,
      message: "Policy check skipped.",
    };
  }
}

export async function assertServiceAllowed(ctx: PolicyEvaluationContext): Promise<void> {
  const decision = await evaluatePlatformPolicy(ctx);
  if (decision.blocked && decision.code) {
    throw new AuthError(decision.httpStatus, decision.code, decision.message);
  }
}
