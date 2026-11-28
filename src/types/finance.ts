export type FeeFrequency = "one_time" | "monthly" | "installment" | "admission";

export type FeePaymentMethod =
  "cash" | "upi" | "bank_transfer" | "card" | "razorpay" | "other";

export interface FeeStructureRecord {
  id: string;
  instituteId: string;
  name: string;
  courseName: string;
  frequency: FeeFrequency;
  amountPaise: number;
  admissionFeePaise: number;
  lateFeePaise: number;
  dueDayOfMonth?: number | null;
  discountEligible: boolean;
  effectiveFrom: string;
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeReceiptRecord {
  id: string;
  receiptNumber: string;
  instituteId: string;
  instituteName: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  courseName: string;
  feePlanId: string;
  paymentId: string;
  feePeriod: string;
  amountPaise: number;
  discountPaise: number;
  remainingDuesPaise: number;
  paymentMethod: FeePaymentMethod;
  transactionRef: string | null;
  issuedByUid: string;
  status: "issued" | "cancelled";
  issuedAt: string;
  reversalRef?: string | null;
  reversedAt?: string | null;
  reversedByUid?: string | null;
  reversalReason?: string | null;
}

export interface FeeRefundRecord {
  id: string;
  instituteId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  feePlanId: string;
  originalPaymentId: string;
  originalReceiptNumber: string | null;
  amountPaise: number;
  reason: string;
  paymentMethod: FeePaymentMethod;
  actorUid: string;
  createdAt: string;
}

export interface InstituteCategoryRecord {
  id: string;
  instituteId: string;
  name: string;
  type: "income" | "expense";
  status: "active" | "inactive";
  description: string;
  createdAt: string;
}

export interface InstituteAccountRecord {
  id: string;
  instituteId: string;
  name: string;
  accountType: "cash" | "bank" | "upi";
  openingBalancePaise: number;
  ledgerBalancePaise: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface InstituteLedgerEntryRecord {
  id: string;
  instituteId: string;
  entryType: "income" | "expense" | "transfer" | "reversal";
  date: string;
  categoryId: string | null;
  categoryName: string;
  description: string;
  vendorOrPayee: string | null;
  amountPaise: number;
  paymentMethod: FeePaymentMethod;
  accountId: string;
  toAccountId?: string | null;
  reference: string | null;
  reversedEntryId?: string | null;
  status: "posted" | "reversed";
  createdByUid: string;
  createdAt: string;
}
