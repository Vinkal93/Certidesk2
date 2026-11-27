import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({}),
}));

import {
  computeInvoiceTotals,
  generateBillingInvoice,
  listPlanVersions,
  renderInvoicePrintableHtml,
  resolveEffectiveRule,
  upsertPricingRule,
} from "@/services/billing.service";
import type { SessionUser } from "@/types/auth";
import type { BillingInvoiceRecord, BillingPricingRuleRecord } from "@/types/billing";

const instAdmin: SessionUser = {
  uid: "inst_1",
  email: "admin@inst.edu",
  role: "institute_admin",
  instituteId: "INST_1",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

function makeRule(
  overrides: Partial<BillingPricingRuleRecord> = {}
): BillingPricingRuleRecord {
  const now = "2026-11-26T00:00:00.000Z";
  return {
    id: "PRC_1",
    serviceKey: "student_admission",
    description: "Admission Fee",
    amountPaise: 15000,
    currency: "INR",
    unit: "per_student",
    applicablePlanId: null,
    applicableInstituteId: null,
    minQty: 1,
    maxQty: null,
    taxTreatment: "exempt",
    taxRateBps: 0,
    effectiveStart: "2026-01-01",
    effectiveEnd: null,
    status: "active",
    reason: "Default",
    createdAt: now,
    updatedAt: now,
    updatedByUid: "su_1",
    ...overrides,
  };
}

describe("Enterprise Plans & Billing Control Center", () => {
  it("computes invoice line items and tax totals in integer paise", () => {
    const totals = computeInvoiceTotals([
      {
        description: "Pro Plan Monthly",
        quantity: 2,
        unitPricePaise: 199900,
        taxRateBps: 1800,
      },
    ]);

    expect(totals.taxableAmountPaise).toBe(399800);
    expect(totals.taxAmountPaise).toBe(71964);
    expect(totals.totalAmountPaise).toBe(471764);
  });

  it("resolves effective pricing with Institute Override > Plan Rule > Global Rule precedence", () => {
    const rules = [
      makeRule({ id: "GLOBAL", amountPaise: 15000 }),
      makeRule({ id: "PLAN_PRO", applicablePlanId: "pro", amountPaise: 12000 }),
      makeRule({
        id: "INST_VIP",
        applicableInstituteId: "INST_VIP",
        amountPaise: 9000,
      }),
    ];

    expect(
      resolveEffectiveRule({
        rules,
        serviceKey: "student_admission",
        planId: "pro",
        instituteId: "INST_VIP",
      })?.id
    ).toBe("INST_VIP");

    expect(
      resolveEffectiveRule({
        rules,
        serviceKey: "student_admission",
        planId: "pro",
        instituteId: "INST_OTHER",
      })?.id
    ).toBe("PLAN_PRO");

    expect(
      resolveEffectiveRule({
        rules,
        serviceKey: "student_admission",
        planId: "starter",
        instituteId: "INST_OTHER",
      })?.id
    ).toBe("GLOBAL");
  });

  it("renders printable HTML invoice with legal seller, GSTIN, and integer-paise amounts", () => {
    const inv: BillingInvoiceRecord = {
      id: "BINV_1",
      invoiceNumber: "INV-2026-000001",
      instituteId: "INST_1",
      instituteName: "Apex Academy",
      billingAddress: "Pune, MH",
      customerGstin: "27AAAAA0000A1Z5",
      sellerLegalName: "CertiDesk Pro Pvt. Ltd.",
      sellerGstin: "27BBBBB0000B1Z5",
      billingType: "subscription",
      subscriptionId: null,
      issueDate: "2026-11-26",
      dueDate: "2026-12-11",
      lineItems: [
        {
          description: "Pro Plan",
          quantity: 1,
          unitPricePaise: 199900,
          taxRateBps: 1800,
          taxablePaise: 199900,
          taxPaise: 35982,
          totalPaise: 235882,
        },
      ],
      taxableAmountPaise: 199900,
      taxAmountPaise: 35982,
      totalAmountPaise: 235882,
      currency: "INR",
      status: "issued",
      paymentReference: null,
      notes: "",
      createdByUid: "su_1",
      createdAt: "2026-11-26T00:00:00.000Z",
      updatedAt: "2026-11-26T00:00:00.000Z",
    };

    const html = renderInvoicePrintableHtml(inv);
    expect(html).toContain("INV-2026-000001");
    expect(html).toContain("CertiDesk Pro Pvt. Ltd.");
    expect(html).toContain("27BBBBB0000B1Z5");
    expect(html).toContain("₹2358.82");
  });

  it("blocks non-super-admin users from billing engine services", async () => {
    await expect(listPlanVersions(instAdmin)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    await expect(
      upsertPricingRule(instAdmin, {
        serviceKey: "student_admission",
        description: "Hack",
        amountPaise: 0,
        currency: "INR",
        unit: "per_student",
        applicablePlanId: null,
        applicableInstituteId: null,
        minQty: 1,
        maxQty: null,
        taxTreatment: "exempt",
        taxRateBps: 0,
        effectiveStart: "2026-01-01",
        effectiveEnd: null,
        status: "active",
        reason: "Unauthorized",
      })
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    await expect(
      generateBillingInvoice(instAdmin, {
        instituteId: "INST_1",
        billingType: "subscription",
        dueDate: "2026-12-01",
        sellerLegalName: "Test",
        lineItems: [
          { description: "Test", quantity: 1, unitPricePaise: 100, taxRateBps: 0 },
        ],
      })
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("enforces server-only Firestore rules on all billing collections", () => {
    const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf-8");
    expect(rules).toContain("match /planVersions/{versionId}");
    expect(rules).toContain("match /pricingRules/{ruleId}");
    expect(rules).toContain("match /billingInvoices/{invoiceId}");
    expect(rules).toContain("match /creditNotes/{noteId}");
  });
});
