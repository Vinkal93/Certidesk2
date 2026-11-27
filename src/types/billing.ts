export type PlanStatus = "draft" | "active" | "retired";
export type BillingModel = "prepaid_wallet" | "subscription" | "hybrid";
export type BillingInterval = "monthly" | "yearly" | "one_time";

export interface PlanAllowances {
  maxStudents: number;
  maxStaff: number;
  storageLimitBytes: number;
  maxCertificatesPerMonth: number;
  maxMarksheetsPerMonth: number;
  maxApiCallsPerDay: number;
}

export interface PlanVersionRecord {
  id: string;
  planId: string;
  planCode: string;
  version: number;
  name: string;
  description: string;
  billingModel: BillingModel;
  pricePaise: number;
  currency: "INR";
  billingInterval: BillingInterval;
  trialDays: number;
  gracePeriodDays: number;
  overagePolicy: "block" | "pay_per_use" | "grace_warn";
  allowances: PlanAllowances;
  features: string[];
  isPublic: boolean;
  status: PlanStatus;
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdAt: string;
  createdByUid: string;
}

export type ExtendedSubscriptionStatus =
  | "draft"
  | "pending_activation"
  | "trial"
  | "active"
  | "grace_period"
  | "past_due"
  | "suspended"
  | "pending_cancellation"
  | "cancelled"
  | "expired";

export interface BillingPricingRuleRecord {
  id: string;
  serviceKey:
    | "student_admission"
    | "profile_edit"
    | "certificate_issue"
    | "marksheet_issue"
    | "custom";
  description: string;
  amountPaise: number;
  currency: "INR";
  unit: string;
  applicablePlanId: string | null;
  applicableInstituteId: string | null;
  minQty: number;
  maxQty: number | null;
  taxTreatment: "exempt" | "taxable_exclusive" | "taxable_inclusive";
  taxRateBps: number;
  effectiveStart: string;
  effectiveEnd: string | null;
  status: "active" | "scheduled" | "retired";
  reason: string;
  createdAt: string;
  updatedAt: string;
  updatedByUid: string;
}

export type BillingInvoiceStatus =
  "draft" | "issued" | "paid" | "pending" | "overdue" | "cancelled" | "credited";

export interface BillingInvoiceLineItem {
  description: string;
  quantity: number;
  unitPricePaise: number;
  taxRateBps: number;
  taxablePaise: number;
  taxPaise: number;
  totalPaise: number;
}

export interface BillingInvoiceRecord {
  id: string;
  invoiceNumber: string;
  instituteId: string;
  instituteName: string;
  billingAddress: string;
  customerGstin: string | null;
  sellerLegalName: string;
  sellerGstin: string | null;
  billingType: "subscription" | "service_fee" | "wallet_settlement" | "adjustment";
  subscriptionId: string | null;
  issueDate: string;
  dueDate: string;
  lineItems: BillingInvoiceLineItem[];
  taxableAmountPaise: number;
  taxAmountPaise: number;
  totalAmountPaise: number;
  currency: "INR";
  status: BillingInvoiceStatus;
  paymentReference: string | null;
  notes: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCreditNoteRecord {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  instituteId: string;
  amountPaise: number;
  reason: string;
  status: "issued";
  createdByUid: string;
  createdAt: string;
}
