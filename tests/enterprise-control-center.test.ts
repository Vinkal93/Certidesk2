import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

import {
  resolveEntitlementDecision,
  type EntitlementOverrideRecord,
  type InstituteSubscriptionRecord,
} from "@/services/entitlement.service";
import { evaluateFeatureFlag } from "@/services/feature-flags.service";
import {
  resolveActiveEmergencyState,
  type EmergencyControlState,
} from "@/services/emergency.service";
import { getCurrentBillingPeriod } from "@/services/metering.service";
import { suNavGroups } from "@/config/su-nav";

describe("Enterprise Super Admin Control Center", () => {
  describe("Entitlements & Historical Pricing Snapshots", () => {
    const baseSub: InstituteSubscriptionRecord = {
      id: "sub_1",
      instituteId: "inst_1",
      planId: "plan_starter",
      planName: "Starter",
      status: "active",
      billingCycle: "monthly",
      currentPeriodStart: "2026-11-01T00:00:00.000Z",
      currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      priceSnapshotRupees: 999,
      limitsSnapshot: {
        maxStudents: 100,
        maxStaff: 10,
        storageLimitMb: 1024,
      },
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
      updatedByUid: "su_1",
    };

    it("enforces subscription quota limits when usage reaches maxStudents", () => {
      const denied = resolveEntitlementDecision({
        featureKey: "students",
        subscription: baseSub,
        override: null,
        currentUsage: 100,
      });
      expect(denied.allowed).toBe(false);
      expect(denied.source).toBe("subscription");
      expect(denied.limit).toBe(100);

      const allowed = resolveEntitlementDecision({
        featureKey: "students",
        subscription: baseSub,
        override: null,
        currentUsage: 99,
      });
      expect(allowed.allowed).toBe(true);
    });

    it("honors active entitlement overrides and falls back when expired", () => {
      const activeOverride: EntitlementOverrideRecord = {
        id: "inst_1_students",
        instituteId: "inst_1",
        featureKey: "students",
        enabled: true,
        limitOverride: 250,
        reason: "Enterprise expansion",
        expiresAt: "2026-12-31T00:00:00.000Z",
        createdByUid: "su_1",
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      };

      const duringOverride = resolveEntitlementDecision({
        featureKey: "students",
        subscription: baseSub,
        override: activeOverride,
        currentUsage: 150,
        now: new Date("2026-11-15T00:00:00.000Z"),
      });
      expect(duringOverride.allowed).toBe(true);
      expect(duringOverride.source).toBe("override");
      expect(duringOverride.limit).toBe(250);

      const afterExpiry = resolveEntitlementDecision({
        featureKey: "students",
        subscription: baseSub,
        override: activeOverride,
        currentUsage: 150,
        now: new Date("2027-01-05T00:00:00.000Z"),
      });
      expect(afterExpiry.allowed).toBe(false);
      expect(afterExpiry.source).toBe("subscription");
    });

    it("denies access when subscription is suspended", () => {
      const decision = resolveEntitlementDecision({
        featureKey: "students",
        subscription: { ...baseSub, status: "suspended" },
        override: null,
        currentUsage: 5,
      });
      expect(decision.allowed).toBe(false);
    });
  });

  describe("Feature Flags & Kill Switch Precedence", () => {
    it("forces false when killSwitchActive is true regardless of overrides", () => {
      const enabled = evaluateFeatureFlag(
        {
          globalEnabled: true,
          killSwitchActive: true,
          planAllowlist: ["pro"],
          instituteOverrides: { inst_1: true },
        },
        { instituteId: "inst_1", planId: "pro" }
      );
      expect(enabled).toBe(false);
    });

    it("prefers institute override over plan allowlist", () => {
      const enabled = evaluateFeatureFlag(
        {
          globalEnabled: false,
          killSwitchActive: false,
          planAllowlist: ["enterprise"],
          instituteOverrides: { inst_beta: true },
        },
        { instituteId: "inst_beta", planId: "starter" }
      );
      expect(enabled).toBe(true);
    });

    it("evaluates plan allowlist when no institute override is set", () => {
      const flag = {
        globalEnabled: true,
        killSwitchActive: false,
        planAllowlist: ["enterprise"],
        instituteOverrides: {},
      };
      expect(evaluateFeatureFlag(flag, { instituteId: "inst_2", planId: "starter" })).toBe(false);
      expect(evaluateFeatureFlag(flag, { instituteId: "inst_2", planId: "enterprise" })).toBe(true);
    });
  });

  describe("Emergency Controls Auto-Expiry & Rollback", () => {
    const state: EmergencyControlState = {
      id: "emergency_state",
      maintenanceMode: true,
      readOnlyMode: true,
      registrationPaused: false,
      paymentsPaused: true,
      certificatesPaused: false,
      reason: "Scheduled DB maintenance",
      expiresAt: "2026-11-26T12:00:00.000Z",
      updatedAt: "2026-11-26T11:00:00.000Z",
      updatedByUid: "su_1",
    };

    it("keeps emergency flags active prior to expiresAt", () => {
      const res = resolveActiveEmergencyState(
        state,
        new Date("2026-11-26T11:30:00.000Z")
      );
      expect(res.expired).toBe(false);
      expect(res.flags.maintenanceMode).toBe(true);
      expect(res.flags.paymentsPaused).toBe(true);
    });

    it("automatically resets all emergency flags after expiresAt", () => {
      const res = resolveActiveEmergencyState(
        state,
        new Date("2026-11-26T12:01:00.000Z")
      );
      expect(res.expired).toBe(true);
      expect(res.flags.maintenanceMode).toBe(false);
      expect(res.flags.readOnlyMode).toBe(false);
      expect(res.flags.paymentsPaused).toBe(false);
    });
  });

  describe("Usage Metering Period Partitioning", () => {
    it("partitions billing periods cleanly by YYYY-MM", () => {
      expect(getCurrentBillingPeriod(new Date("2026-11-26T10:00:00.000Z"))).toBe("2026-11");
      expect(getCurrentBillingPeriod(new Date("2026-12-01T00:00:00.000Z"))).toBe("2026-12");
    });
  });

  describe("Super Admin Sidebar Route Completeness", () => {
    it("every sidebar href resolves to a real App Router page.tsx file", () => {
      const portalDir = path.resolve(process.cwd(), "src/app/su/(portal)");
      const missing: string[] = [];

      for (const group of suNavGroups) {
        for (const item of group.items) {
          const rel = item.href.replace(/^\/su\/?/, "");
          const pagePath = path.join(portalDir, rel, "page.tsx");
          if (!fs.existsSync(pagePath)) {
            missing.push(`${item.href} -> ${pagePath}`);
          }
        }
      }

      expect(missing).toEqual([]);
    });
  });
});
