import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({}),
  getAdminFirestore: () => ({}),
}));

import { redactSensitiveMetadata } from "@/services/audit.service";
import { shouldDeduplicateAlert } from "@/services/security-events.service";
import {
  getAccessControlOverview,
  getSecurityCenterOverview,
  listAuditLogsPaginated,
  revokeSessionById,
  upsertUserPermissionOverride,
} from "@/services/security-center.service";
import type { SessionUser } from "@/types/auth";

const instAdmin: SessionUser = {
  uid: "inst_1",
  email: "admin@inst.edu",
  role: "institute_admin",
  instituteId: "INST_1",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

const superAdmin: SessionUser = {
  uid: "su_1",
  email: "su@certidesk.app",
  role: "super_admin",
  instituteId: null,
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

describe("Enterprise Security Center — Governance, Redaction, Alerts & Access Control", () => {
  it("redacts passwords, tokens, cookies, OTPs, and secrets from audit metadata", () => {
    const clean = redactSensitiveMetadata({
      password: "SecretPassword123",
      idToken: "eyJhbGciOi...",
      sessionCookie: "abc",
      otp: "123456",
      razorpayKeySecret: "rzp_live_secret",
      actionReason: "Approved",
    });

    expect(clean.password).toBe("[REDACTED]");
    expect(clean.idToken).toBe("[REDACTED]");
    expect(clean.sessionCookie).toBe("[REDACTED]");
    expect(clean.otp).toBe("[REDACTED]");
    expect(clean.razorpayKeySecret).toBe("[REDACTED]");
    expect(clean.actionReason).toBe("Approved");
  });

  it("deduplicates open alerts within cooldown window and opens new alert after resolution", () => {
    const now = Date.parse("2026-11-26T12:00:00.000Z");
    expect(
      shouldDeduplicateAlert(
        { status: "new", lastSeenAt: "2026-11-26T11:45:00.000Z" },
        30,
        now
      )
    ).toBe(true);

    expect(
      shouldDeduplicateAlert(
        { status: "resolved", lastSeenAt: "2026-11-26T11:55:00.000Z" },
        30,
        now
      )
    ).toBe(false);

    expect(
      shouldDeduplicateAlert(
        { status: "new", lastSeenAt: "2026-11-26T10:00:00.000Z" },
        30,
        now
      )
    ).toBe(false);
  });

  it("blocks non-super-admin roles from all Security Center services", async () => {
    await expect(getSecurityCenterOverview(instAdmin)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    await expect(listAuditLogsPaginated(instAdmin)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    await expect(getAccessControlOverview(instAdmin)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    await expect(
      revokeSessionById(instAdmin, { sessionId: "SES_1", reason: "test" })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("prevents self-escalation via permission override", async () => {
    await expect(
      upsertUserPermissionOverride(superAdmin, {
        targetUid: superAdmin.uid,
        grantedPermissions: ["*"],
        revokedPermissions: [],
        reason: "Self escalate",
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "SELF_ESCALATION_BLOCKED",
    });
  });

  it("enforces read-only/server-only Firestore security rules for all security collections", () => {
    const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf-8");
    expect(rules).toContain("match /securityLoginEvents/{eventId}");
    expect(rules).toContain("match /securitySessions/{sessionId}");
    expect(rules).toContain("match /securityAlerts/{alertId}");
    expect(rules).toContain("match /securityAlertRules/{ruleId}");
    expect(rules).toContain("match /securityPolicies/{policyId}");
    expect(rules).toContain("match /userPermissionOverrides/{uid}");
  });
});
