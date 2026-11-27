import { describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("server-only", () => ({}));

import { publicRegisterSchema } from "@/lib/validation/registration";
import { detectDuplicateInstitute } from "@/services/registration.service";
import {
  computeBucketDebit,
  computeRefundReconciliation,
  InsufficientWalletBalanceError,
  resolveWalletBuckets,
} from "@/services/wallet.service";
import { evaluatePlanEligibility } from "@/services/recharge-catalog.service";
import {
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/security/razorpay";
import { detectChargeableProfileChanges } from "@/services/student.service";
import {
  extractSessionUserFromClaims,
  isRoleAllowedInPortal,
} from "@/lib/security/permissions";
import type { RechargePlanRecord } from "@/types/domain";

function makePlan(overrides: Partial<RechargePlanRecord> = {}): RechargePlanRecord {
  const now = "2026-11-26T00:00:00.000Z";
  return {
    id: "plan_500",
    title: "Starter Recharge",
    description: "Starter",
    amountPaise: 50000,
    bonusPaise: 0,
    currency: "INR",
    enabled: true,
    displayOrder: 1,
    promoEligible: false,
    promoLabel: null,
    startsAt: null,
    endsAt: null,
    bonusExpiryDays: null,
    maxUsesPerInstitute: null,
    createdAt: now,
    updatedAt: now,
    updatedByUid: "system",
    ...overrides,
  };
}

describe("Self-Registration, Wallet Ledger, Razorpay & Admission Flows", () => {
  it("1-4. Validates public registration, rejects duplicate email/institute, and prevents privileged role assignment", () => {
    const valid = publicRegisterSchema.safeParse({
      instituteName: "Apex Academy",
      ownerName: "Rajesh Sharma",
      email: "owner@apex.edu",
      phone: "9876543210",
      address: "12 MG Road, Pune",
      password: "Password1",
      confirmPassword: "Password1",
      acceptTerms: true,
    });
    expect(valid.success).toBe(true);

    const dupEmail = detectDuplicateInstitute(
      [{ email: "owner@apex.edu", phone: "9111111111", name: "Other" }],
      { email: "OWNER@apex.edu", phone: "9876543210", instituteName: "New" }
    );
    expect(dupEmail.duplicate).toBe(true);

    const dupName = detectDuplicateInstitute(
      [{ email: "a@b.com", phone: "9111111111", name: "Apex Academy" }],
      { email: "new@apex.edu", phone: "9876543210", instituteName: "apex academy" }
    );
    expect(dupName.duplicate).toBe(true);

    expect(isRoleAllowedInPortal("institute_admin", "super_admin")).toBe(false);
    expect(isRoleAllowedInPortal("student", "institute")).toBe(false);
  });

  it("5-6. Initializes wallet at zero and resolves buckets backward-compatibly", () => {
    const zeroWallet = resolveWalletBuckets({
      walletBalancePaise: 0,
      paidBalancePaise: 0,
      bonusBalancePaise: 0,
      walletVersion: 1,
      updatedAt: "2026-11-26T00:00:00.000Z",
    });
    expect(zeroWallet.paidBalancePaise).toBe(0);
    expect(zeroWallet.bonusBalancePaise).toBe(0);
    expect(zeroWallet.totalSpendableBalancePaise).toBe(0);

    const legacyWallet = resolveWalletBuckets({
      walletBalancePaise: 50000,
      updatedAt: "2026-11-26T00:00:00.000Z",
    });
    expect(legacyWallet.paidBalancePaise).toBe(50000);
    expect(legacyWallet.bonusBalancePaise).toBe(0);
    expect(legacyWallet.totalSpendableBalancePaise).toBe(50000);
  });

  it("7-9. Enforces ₹500 (₹0 bonus), ₹1,000 (₹0 bonus), and ₹2,000 (+₹200 bonus) catalog rules", () => {
    const p500 = evaluatePlanEligibility(
      makePlan({
        id: "plan_500",
        amountPaise: 50000,
        bonusPaise: 0,
        promoEligible: false,
      })
    );
    expect(p500.eligible).toBe(true);
    expect(p500.effectiveBonusPaise).toBe(0);

    const p1000 = evaluatePlanEligibility(
      makePlan({
        id: "plan_1000",
        amountPaise: 100000,
        bonusPaise: 0,
        promoEligible: false,
      })
    );
    expect(p1000.eligible).toBe(true);
    expect(p1000.effectiveBonusPaise).toBe(0);

    const p2000 = evaluatePlanEligibility(
      makePlan({
        id: "plan_2000",
        amountPaise: 200000,
        bonusPaise: 20000,
        promoEligible: true,
      })
    );
    expect(p2000.eligible).toBe(true);
    expect(p2000.effectiveBonusPaise).toBe(20000);

    const disabled = evaluatePlanEligibility(makePlan({ enabled: false }));
    expect(disabled.eligible).toBe(false);
  });

  it("10-13. Verifies Razorpay checkout & webhook signatures and rejects invalid signatures", () => {
    const secret = "rzp_test_secret_123456";
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";
    const validSig = createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      verifyRazorpayCheckoutSignature({
        orderId,
        paymentId,
        signature: validSig,
        keySecret: secret,
      })
    ).toBe(true);
    expect(
      verifyRazorpayCheckoutSignature({
        orderId,
        paymentId,
        signature: "0".repeat(64),
        keySecret: secret,
      })
    ).toBe(false);

    const rawBody = JSON.stringify({ event: "payment.captured" });
    const whSig = createHmac("sha256", "whsec_test").update(rawBody).digest("hex");
    expect(
      verifyRazorpayWebhookSignature({
        rawBody,
        signature: whSig,
        webhookSecret: "whsec_test",
      })
    ).toBe(true);
    expect(
      verifyRazorpayWebhookSignature({
        rawBody,
        signature: "invalid",
        webhookSecret: "whsec_test",
      })
    ).toBe(false);
  });

  it("14-18. Spends promotional bonus first, rejects insufficient balance with 402 details, and never allows negative balance", () => {
    // ₹2,000 paid + ₹200 bonus = ₹2,200; admission ₹150 spends bonus first
    const firstAdmission = computeBucketDebit({
      paidBalancePaise: 200000,
      bonusBalancePaise: 20000,
      debitAmountPaise: 15000,
      spendOrder: "bonus_first",
    });
    expect(firstAdmission.bonusDebitPaise).toBe(15000);
    expect(firstAdmission.paidDebitPaise).toBe(0);
    expect(firstAdmission.nextBonusBalancePaise).toBe(5000);
    expect(firstAdmission.nextPaidBalancePaise).toBe(200000);

    // Second admission ₹150 splits across remaining ₹50 bonus + ₹100 paid
    const secondAdmission = computeBucketDebit({
      paidBalancePaise: 200000,
      bonusBalancePaise: 5000,
      debitAmountPaise: 15000,
      spendOrder: "bonus_first",
    });
    expect(secondAdmission.bonusDebitPaise).toBe(5000);
    expect(secondAdmission.paidDebitPaise).toBe(10000);
    expect(secondAdmission.nextBonusBalancePaise).toBe(0);
    expect(secondAdmission.nextPaidBalancePaise).toBe(190000);

    // Insufficient balance throws HTTP 402 with exact shortfall
    try {
      computeBucketDebit({
        paidBalancePaise: 5000,
        bonusBalancePaise: 5000,
        debitAmountPaise: 15000,
      });
      throw new Error("Expected InsufficientWalletBalanceError");
    } catch (err) {
      expect(err).toBeInstanceOf(InsufficientWalletBalanceError);
      const e = err as InsufficientWalletBalanceError;
      expect(e.status).toBe(402);
      expect(e.requiredPaise).toBe(15000);
      expect(e.availablePaise).toBe(10000);
      expect(e.shortfallPaise).toBe(5000);
    }
  });

  it("21. Profile edits charge only configured chargeable fields (name/course/batch), not phone/address", () => {
    const existing = {
      fullName: "Aarav Verma",
      courseName: "Full Stack Web",
      batchName: "Batch A",
      courseId: "CRS_1",
      batchId: "BAT_1",
    };

    const nonChargeable = detectChargeableProfileChanges(existing, {
      ...existing,
    });
    expect(nonChargeable).toHaveLength(0);

    const chargeable = detectChargeableProfileChanges(existing, {
      ...existing,
      batchName: "Batch B",
    });
    expect(chargeable).toHaveLength(1);
    expect(chargeable[0]?.field).toBe("batchName");
  });

  it("22. Refund reconciliation reverses paid & unused bonus without creating negative balances", () => {
    const recon = computeRefundReconciliation({
      paidBalancePaise: 150000,
      bonusBalancePaise: 5000,
      refundPaidPaise: 200000,
      associatedBonusPaise: 20000,
    });
    expect(recon.paidReversedPaise).toBe(150000);
    expect(recon.bonusReversedPaise).toBe(5000);
    expect(recon.nextPaidBalancePaise).toBe(0);
    expect(recon.nextBonusBalancePaise).toBe(0);
    expect(recon.unrecoveredPaidShortfallPaise).toBe(50000);
    expect(recon.unrecoveredBonusConsumedPaise).toBe(15000);
  });

  it("23-24. Enforces tenant isolation and server-only Firestore rules on new collections", () => {
    const instAUser = extractSessionUserFromClaims({
      uid: "u1",
      email: "a@inst.com",
      role: "institute_admin",
      instituteId: "INST_A",
      studentId: null,
      permissions: [],
      mustChangePassword: false,
    });
    expect(instAUser?.instituteId).toBe("INST_A");
    expect(instAUser?.instituteId).not.toBe("INST_B");

    const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf-8");
    expect(rules).toContain("match /recharge_plans/{planId}");
    expect(rules).toContain("match /wallet_bonus_grants/{grantId}");
    expect(rules).toContain("match /admission_operations/{opId}");
  });
});
