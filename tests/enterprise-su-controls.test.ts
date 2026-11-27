import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { suNavGroups } from "@/config/su-nav";
import { instituteNavGroups } from "@/config/institute-nav";
import { validateUserControlTarget } from "@/services/su-users.service";
import { resolveEntitlementDecision } from "@/services/entitlement.service";
import { verifySuperAdminSecretCode } from "@/services/auth.service";

describe("Super Admin navigation & unified All Users controls", () => {
  it("replaces separate Students and Staff sidebar items with All Users", () => {
    const businessGroup = suNavGroups.find((g) => g.title === "BUSINESS MANAGEMENT");
    expect(businessGroup).toBeDefined();
    const hrefs = businessGroup!.items.map((item) => item.href);
    expect(hrefs).toContain("/su/users");
    expect(hrefs).not.toContain("/su/students");
    expect(hrefs).not.toContain("/su/staff");
  });

  it("blocks self-targeting actions and super_admin deletion", () => {
    expect(() =>
      validateUserControlTarget({
        actorUid: "su-1",
        targetUid: "su-1",
        targetRole: "super_admin",
        action: "block",
      })
    ).toThrow(/cannot block, force-logout, or delete your own/i);

    expect(() =>
      validateUserControlTarget({
        actorUid: "su-1",
        targetUid: "su-2",
        targetRole: "super_admin",
        action: "delete",
      })
    ).toThrow(/cannot be deleted/i);

    expect(() =>
      validateUserControlTarget({
        actorUid: "su-1",
        targetUid: "stu-1",
        targetRole: "student",
        action: "delete",
      })
    ).not.toThrow();
  });

  it("evaluates monthly platform subscription fee records accurately", () => {
    const decision = resolveEntitlementDecision({
      featureKey: "students",
      subscription: {
        id: "sub-1",
        instituteId: "inst-1",
        planId: "__monthly_platform_fee__",
        planName: "Platform Monthly Fee",
        status: "active",
        billingCycle: "monthly",
        currentPeriodStart: "2026-11-01T00:00:00.000Z",
        currentPeriodEnd: "2026-12-01T00:00:00.000Z",
        priceSnapshotRupees: 999,
        limitsSnapshot: {
          maxStudents: 10000,
          maxStaff: 500,
          storageLimitMb: 10240,
        },
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
        updatedByUid: "su-1",
      },
      override: null,
      currentUsage: 42,
      now: new Date("2026-11-15T00:00:00.000Z"),
    });

    expect(decision.allowed).toBe(true);
    expect(decision.source).toBe("subscription");
    expect(decision.limit).toBe(10000);
  });

  it("includes Manage Logins in Institute navigation for student & staff credentials", () => {
    const mgmtGroup = instituteNavGroups.find((g) => g.title === "MANAGEMENT");
    expect(mgmtGroup).toBeDefined();
    expect(mgmtGroup!.items.map((i) => i.href)).toContain("/institute/logins");
  });

  it("enforces Super Admin secret key verification server-side", () => {
    expect(() => verifySuperAdminSecretCode("GLTPP2290D")).not.toThrow();
    expect(() => verifySuperAdminSecretCode("wrong-key")).toThrow(
      /Invalid Super Admin Secret Key/i
    );
    expect(() => verifySuperAdminSecretCode("")).toThrow(
      /Invalid Super Admin Secret Key/i
    );
  });
});
