import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({}),
}));

import { normalizePhoneE164 } from "@/services/auth.service";
import {
  adjustInstituteWallet,
  computeManualWalletAdjustment,
  reconcileInstituteWallets,
} from "@/services/wallet-reconciliation.service";
import {
  collectInstituteFee,
  formatReceiptNumber,
  getInstituteFinanceOverview,
  refundInstituteFee,
} from "@/services/institute-finance.service";
import { getStudentReceipts } from "@/services/student-portal.service";
import { decryptSecretPayload, encryptSecretPayload } from "@/lib/gcp/secret-manager";
import type { SessionUser } from "@/types/auth";

const instituteAdminUser: SessionUser = {
  uid: "inst_1",
  email: "owner@inst.edu",
  role: "institute_admin",
  instituteId: "INST_1",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

const studentUser: SessionUser = {
  uid: "stu_1",
  email: "stu@inst.edu",
  role: "student",
  instituteId: "INST_1",
  studentId: "STU_1",
  permissions: [],
  mustChangePassword: false,
};

const limitedStaffUser: SessionUser = {
  uid: "staff_1",
  email: "staff@inst.edu",
  role: "staff",
  instituteId: "INST_1",
  studentId: null,
  permissions: ["attendance:read"],
  mustChangePassword: false,
};

describe("Auth, Wallet Reconciliation, Finance & Student Portal", () => {
  it("normalizes Indian mobile numbers to E.164 and rejects invalid strings", () => {
    expect(normalizePhoneE164("9876543210")).toBe("+919876543210");
    expect(normalizePhoneE164("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhoneE164("12345")).toBeNull();
    expect(normalizePhoneE164("not-a-phone")).toBeNull();
  });

  it("updates both paidBalancePaise and bonusBalancePaise atomically on manual adjustments", () => {
    const credit = computeManualWalletAdjustment({
      paidBalancePaise: 50000,
      bonusBalancePaise: 20000,
      type: "credit",
      amountPaise: 10000,
    });
    expect(credit).toEqual({
      balanceBeforePaise: 70000,
      balanceAfterPaise: 80000,
      nextPaidBalancePaise: 60000,
      nextBonusBalancePaise: 20000,
    });

    const debit = computeManualWalletAdjustment({
      paidBalancePaise: 50000,
      bonusBalancePaise: 20000,
      type: "debit",
      amountPaise: 25000,
    });
    expect(debit).toEqual({
      balanceBeforePaise: 70000,
      balanceAfterPaise: 45000,
      nextPaidBalancePaise: 45000,
      nextBonusBalancePaise: 0,
    });

    expect(() =>
      computeManualWalletAdjustment({
        paidBalancePaise: 10000,
        bonusBalancePaise: 0,
        type: "debit",
        amountPaise: 15000,
      })
    ).toThrow(/Insufficient wallet balance/i);
  });

  it("formats sequential fee receipt numbers consistently", () => {
    const d = new Date("2026-11-27T00:00:00.000Z");
    expect(formatReceiptNumber("APEX", 1, d)).toBe("RCP-APEX-2026-0001");
    expect(formatReceiptNumber("APEX", 42, d)).toBe("RCP-APEX-2026-0042");
  });

  it("enforces Super Admin, Staff, and Student authorization boundaries", async () => {
    await expect(
      adjustInstituteWallet(instituteAdminUser, {
        instituteId: "INST_1",
        type: "credit",
        amountPaise: 5000,
        reason: "Unauthorized test",
        idempotencyKey: "KEY_1",
        actorUid: "inst_1",
      })
    ).rejects.toThrow(/Super Admin authorization required/i);

    await expect(reconcileInstituteWallets(instituteAdminUser)).rejects.toThrow(
      /Super Admin authorization required/i
    );

    await expect(getInstituteFinanceOverview(limitedStaffUser)).rejects.toThrow(
      /Missing fees:read permission/i
    );

    await expect(
      collectInstituteFee(limitedStaffUser, {
        feePlanId: "FPL_1",
        amountRupees: 500,
        method: "cash",
      })
    ).rejects.toThrow(/Missing fees:write permission/i);

    await expect(
      refundInstituteFee(studentUser, {
        paymentId: "FPY_1",
        amountRupees: 100,
        reason: "Student self-refund attempt",
        method: "cash",
      })
    ).rejects.toThrow(/Missing fees:write permission/i);

    await expect(getStudentReceipts(instituteAdminUser)).rejects.toThrow(
      /Student authentication required/i
    );
  });

  it("locks all new finance collections to server-only writes in firestore.rules", () => {
    const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf8");
    for (const col of [
      "feeStructures",
      "feeReceipts",
      "feeRefunds",
      "instituteCategories",
      "instituteAccounts",
      "instituteLedgerEntries",
    ]) {
      const idx = rules.indexOf(`match /${col}/`);
      expect(idx).toBeGreaterThan(-1);
      const slice = rules.slice(idx, idx + 420);
      expect(slice).toContain("allow write: if false;");
    }
    const vaultIdx = rules.indexOf("match /encryptedGatewaySecrets/");
    expect(vaultIdx).toBeGreaterThan(-1);
    expect(rules.slice(vaultIdx, vaultIdx + 120)).toContain(
      "allow read, write: if false;"
    );
  });

  it("encrypts and decrypts Razorpay secrets cleanly via AES-256-GCM vault fallback", () => {
    const encrypted = encryptSecretPayload("rzp_test_secret_12345");
    expect(encrypted.ciphertext).not.toContain("rzp_test_secret_12345");
    expect(decryptSecretPayload(encrypted)).toBe("rzp_test_secret_12345");
  });
});
