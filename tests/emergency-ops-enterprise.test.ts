import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { evaluateEmergencyPolicyPure } from "@/services/emergency-policy.service";
import {
  INCIDENT_TRANSITIONS,
  SERVICE_REGISTRY,
  type MaintenanceEventRecord,
  type PlatformLockdownRecord,
  type ServiceRestrictionRecord,
} from "@/types/emergency";

describe("Enterprise Emergency Operations Control Center", () => {
  const now = new Date("2026-11-27T12:00:00.000Z");

  it("never locks out Super Admin even during global lockdown and maintenance", () => {
    const maintenance: MaintenanceEventRecord = {
      id: "mnt_1",
      name: "Full Maintenance",
      description: "DB upgrade",
      type: "full_platform",
      scope: "platform",
      affectedServices: [],
      affectedInstituteIds: [],
      status: "active",
      startAt: "2026-11-27T11:00:00.000Z",
      expectedEndAt: "2026-11-27T13:00:00.000Z",
      publicMessage: "Under maintenance",
      notifyInstitutes: true,
      createdByUid: "su_1",
      updatedByUid: "su_1",
      createdAt: "2026-11-27T11:00:00.000Z",
      updatedAt: "2026-11-27T11:00:00.000Z",
    };

    const globalLockdown: PlatformLockdownRecord = {
      id: "lck_1",
      type: "global",
      scope: "platform",
      restrictedServices: [],
      status: "active",
      reason: "Security incident",
      exemptSuperAdminUids: ["su_1"],
      activatedAt: "2026-11-27T11:30:00.000Z",
      createdByUid: "su_1",
      createdAt: "2026-11-27T11:30:00.000Z",
      updatedAt: "2026-11-27T11:30:00.000Z",
    };

    const suDecision = evaluateEmergencyPolicyPure(
      {
        legacyState: null,
        maintenances: [maintenance],
        lockdowns: [globalLockdown],
        restrictions: [],
      },
      { actorRole: "super_admin", serviceId: "certificates", isWrite: true, now }
    );
    expect(suDecision.blocked).toBe(false);

    const instDecision = evaluateEmergencyPolicyPure(
      {
        legacyState: null,
        maintenances: [maintenance],
        lockdowns: [globalLockdown],
        restrictions: [],
      },
      {
        actorRole: "institute_admin",
        instituteId: "inst_1",
        serviceId: "certificates",
        isWrite: true,
        now,
      }
    );
    expect(instDecision.blocked).toBe(true);
    expect(instDecision.code).toBe("MAINTENANCE_ACTIVE");
    expect(instDecision.httpStatus).toBe(503);
  });

  it("enforces institute-specific lockdown without affecting other institutes", () => {
    const instLockdown: PlatformLockdownRecord = {
      id: "lck_inst",
      type: "institute",
      scope: "institute",
      instituteId: "inst_target",
      restrictedServices: [],
      status: "active",
      reason: "Suspicious activity",
      exemptSuperAdminUids: ["su_1"],
      activatedAt: "2026-11-27T11:00:00.000Z",
      createdByUid: "su_1",
      createdAt: "2026-11-27T11:00:00.000Z",
      updatedAt: "2026-11-27T11:00:00.000Z",
    };

    const blockedTarget = evaluateEmergencyPolicyPure(
      {
        legacyState: null,
        maintenances: [],
        lockdowns: [instLockdown],
        restrictions: [],
      },
      { actorRole: "institute_admin", instituteId: "inst_target", now }
    );
    expect(blockedTarget.blocked).toBe(true);
    expect(blockedTarget.code).toBe("LOCKDOWN_ACTIVE");
    expect(blockedTarget.httpStatus).toBe(423);

    const allowedOther = evaluateEmergencyPolicyPure(
      {
        legacyState: null,
        maintenances: [],
        lockdowns: [instLockdown],
        restrictions: [],
      },
      { actorRole: "institute_admin", instituteId: "inst_other", now }
    );
    expect(allowedOther.blocked).toBe(false);
  });

  it("enforces read-only, operation-level, and concurrent restrictions with auto-expiry", () => {
    const readOnlyCerts: ServiceRestrictionRecord = {
      id: "rst_ro",
      serviceId: "certificates",
      restrictionType: "read_only",
      scope: "global",
      instituteIds: [],
      disabledOperations: [],
      status: "active",
      reason: "Audit freeze",
      userMessage: "Certificates are read-only",
      startAt: "2026-11-27T10:00:00.000Z",
      expiresAt: "2026-11-27T11:00:00.000Z", // already expired at 12:00Z
      createdByUid: "su_1",
      createdAt: "2026-11-27T10:00:00.000Z",
      updatedAt: "2026-11-27T10:00:00.000Z",
    };

    const opDisablePayments: ServiceRestrictionRecord = {
      id: "rst_pay",
      serviceId: "payments_razorpay",
      restrictionType: "operation_disable",
      scope: "global",
      instituteIds: [],
      disabledOperations: ["create_order"],
      status: "active",
      reason: "Gateway maintenance",
      userMessage: "New orders paused",
      startAt: "2026-11-27T11:00:00.000Z",
      expiresAt: "2026-11-27T14:00:00.000Z",
      createdByUid: "su_1",
      createdAt: "2026-11-27T11:00:00.000Z",
      updatedAt: "2026-11-27T11:00:00.000Z",
    };

    // Expired cert restriction does not block
    const certWrite = evaluateEmergencyPolicyPure(
      {
        legacyState: null,
        maintenances: [],
        lockdowns: [],
        restrictions: [readOnlyCerts, opDisablePayments],
      },
      {
        actorRole: "institute_admin",
        instituteId: "inst_1",
        serviceId: "certificates",
        isWrite: true,
        now,
      }
    );
    expect(certWrite.blocked).toBe(false);

    // Active payment operation restriction still blocks create_order
    const payOrder = evaluateEmergencyPolicyPure(
      {
        legacyState: null,
        maintenances: [],
        lockdowns: [],
        restrictions: [readOnlyCerts, opDisablePayments],
      },
      {
        actorRole: "institute_admin",
        instituteId: "inst_1",
        serviceId: "payments_razorpay",
        operation: "create_order",
        isWrite: true,
        now,
      }
    );
    expect(payOrder.blocked).toBe(true);
    expect(payOrder.code).toBe("SERVICE_RESTRICTED");
  });

  it("defines valid incident lifecycle transitions and real service registry", () => {
    expect(INCIDENT_TRANSITIONS.detected).toContain("acknowledged");
    expect(INCIDENT_TRANSITIONS.resolved).toContain("closed");
    expect(SERVICE_REGISTRY.length).toBeGreaterThanOrEqual(10);
    expect(SERVICE_REGISTRY.some((s) => s.id === "certificates")).toBe(true);
    expect(SERVICE_REGISTRY.some((s) => s.id === "payments_razorpay")).toBe(true);
  });
});
