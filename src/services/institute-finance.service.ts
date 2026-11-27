import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  feeReceiptsCollection,
  feeRefundsCollection,
  feeStructuresCollection,
  instituteAccountsCollection,
  instituteCategoriesCollection,
  instituteLedgerEntriesCollection,
  studentsCollection,
} from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";
import type { FeePaymentRecord, StudentFeePlanRecord } from "@/types/academic";
import type {
  FeeFrequency,
  FeePaymentMethod,
  FeeReceiptRecord,
  FeeRefundRecord,
  FeeStructureRecord,
  InstituteAccountRecord,
  InstituteCategoryRecord,
  InstituteLedgerEntryRecord,
} from "@/types/finance";

function feePlansCol() {
  return getAdminFirestore().collection(
    "student_fee_plans"
  ) as CollectionReference<StudentFeePlanRecord>;
}

function feePaymentsCol() {
  return getAdminFirestore().collection(
    "fee_payments"
  ) as CollectionReference<FeePaymentRecord>;
}

function notificationsCol() {
  return getAdminFirestore().collection("notifications");
}

export function formatReceiptNumber(
  instituteCode: string,
  seqNumber: number,
  date = new Date()
): string {
  const year = date.getUTCFullYear();
  const padded = String(seqNumber).padStart(4, "0");
  return `RCP-${instituteCode}-${year}-${padded}`;
}

export async function getInstituteFinanceOverview(actor: SessionUser) {
  if (!hasStaffPermission(actor, "fees:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);

  const [plansSnap, paymentsSnap, receiptsSnap, refundsSnap, ledgerSnap, accountsSnap] =
    await Promise.all([
      feePlansCol().where("instituteId", "==", institute.id).get(),
      feePaymentsCol().where("instituteId", "==", institute.id).get(),
      feeReceiptsCollection().where("instituteId", "==", institute.id).get(),
      feeRefundsCollection().where("instituteId", "==", institute.id).get(),
      instituteLedgerEntriesCollection().where("instituteId", "==", institute.id).get(),
      instituteAccountsCollection().where("instituteId", "==", institute.id).get(),
    ]);

  const plans = plansSnap.docs.map((d) => d.data());
  const payments = paymentsSnap.docs.map((d) => d.data());
  const receipts = receiptsSnap.docs.map((d) => d.data());
  const refunds = refundsSnap.docs.map((d) => d.data());
  const ledgerEntries = ledgerSnap.docs.map((d) => d.data());
  const accounts = accountsSnap.docs.map((d) => d.data());

  const now = new Date();
  const todayPrefix = now.toISOString().slice(0, 10);
  const monthPrefix = now.toISOString().slice(0, 7);

  let todayCollectionPaise = 0;
  let monthCollectionPaise = 0;
  const methodTotalsPaise: Record<string, number> = {};

  for (const p of payments) {
    if (p.createdAt.startsWith(todayPrefix)) {
      todayCollectionPaise += p.amountPaise;
    }
    if (p.createdAt.startsWith(monthPrefix)) {
      monthCollectionPaise += p.amountPaise;
    }
    const method = p.paymentMode ?? "cash";
    methodTotalsPaise[method] = (methodTotalsPaise[method] ?? 0) + p.amountPaise;
  }

  let totalOutstandingPaise = 0;
  let paidStudents = 0;
  let partialStudents = 0;
  let pendingStudents = 0;

  for (const plan of plans) {
    totalOutstandingPaise += plan.pendingPaise;
    if (plan.pendingPaise <= 0) {
      paidStudents += 1;
    } else if (plan.paidPaise > 0) {
      partialStudents += 1;
    } else {
      pendingStudents += 1;
    }
  }

  const totalRefundedPaise = refunds.reduce((sum, r) => sum + r.amountPaise, 0);
  const otherIncomePaise = ledgerEntries
    .filter((e) => e.entryType === "income" && e.status === "posted")
    .reduce((sum, e) => sum + e.amountPaise, 0);
  const totalExpensesPaise = ledgerEntries
    .filter((e) => e.entryType === "expense" && e.status === "posted")
    .reduce((sum, e) => sum + e.amountPaise, 0);
  const totalFeesCollectedPaise = payments.reduce((sum, p) => sum + p.amountPaise, 0);

  return {
    instituteId: institute.id,
    instituteName: institute.name,
    todayCollectionPaise,
    monthCollectionPaise,
    totalFeesCollectedPaise,
    totalOutstandingPaise,
    totalRefundedPaise,
    paidStudents,
    partialStudents,
    pendingStudents,
    otherIncomePaise,
    totalExpensesPaise,
    operationalSurplusPaise:
      totalFeesCollectedPaise +
      otherIncomePaise -
      totalRefundedPaise -
      totalExpensesPaise,
    methodTotalsPaise,
    plans: plans.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payments: payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    receipts: receipts.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    refunds: refunds.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    accounts,
    ledgerEntries: ledgerEntries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function listFeeStructures(actor: SessionUser) {
  if (!hasStaffPermission(actor, "fees:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await feeStructuresCollection()
    .where("instituteId", "==", institute.id)
    .get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createFeeStructure(
  actor: SessionUser,
  input: {
    name: string;
    courseName: string;
    frequency: FeeFrequency;
    amountRupees: number;
    admissionFeeRupees?: number | undefined;
    lateFeeRupees?: number | undefined;
    dueDayOfMonth?: number | null | undefined;
    discountEligible?: boolean | undefined;
    effectiveFrom?: string | undefined;
  }
): Promise<FeeStructureRecord> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const amountPaise = Math.round(input.amountRupees * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AuthError(400, "INVALID_AMOUNT", "Fee amount must be positive.");
  }

  const now = new Date().toISOString();
  const id = generateId("FST");
  const record: FeeStructureRecord = {
    id,
    instituteId: institute.id,
    name: input.name.trim(),
    courseName: input.courseName.trim(),
    frequency: input.frequency,
    amountPaise,
    admissionFeePaise: Math.max(0, Math.round((input.admissionFeeRupees ?? 0) * 100)),
    lateFeePaise: Math.max(0, Math.round((input.lateFeeRupees ?? 0) * 100)),
    dueDayOfMonth: input.dueDayOfMonth ?? null,
    discountEligible: input.discountEligible ?? true,
    effectiveFrom: input.effectiveFrom || now.slice(0, 10),
    status: "active",
    createdBy: actor.uid,
    createdAt: now,
    updatedAt: now,
  };

  await feeStructuresCollection().doc(id).set(record);
  await recordAuditLog({
    action: "FEE_STRUCTURE_CREATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: id,
    metadata: { name: record.name, amountPaise: record.amountPaise },
  });
  return record;
}

export async function collectInstituteFee(
  actor: SessionUser,
  input: {
    feePlanId: string;
    amountRupees: number;
    discountRupees?: number | undefined;
    method: FeePaymentMethod;
    feePeriod?: string | undefined;
    reference?: string | undefined;
    accountId?: string | undefined;
  }
): Promise<{
  payment: FeePaymentRecord;
  receipt: FeeReceiptRecord;
  plan: StudentFeePlanRecord;
}> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const amountPaise = Math.round(input.amountRupees * 100);
  const extraDiscountPaise = Math.max(0, Math.round((input.discountRupees ?? 0) * 100));

  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AuthError(400, "INVALID_AMOUNT", "Payment amount must be positive.");
  }

  const db = getAdminFirestore();
  const planRef = feePlansCol().doc(input.feePlanId);
  const existingReceiptsSnap = await feeReceiptsCollection()
    .where("instituteId", "==", institute.id)
    .get();
  const nextReceiptSeq = existingReceiptsSnap.size + 1;

  const result = await db.runTransaction(async (tx) => {
    const planSnap = await tx.get(planRef);
    const plan = planSnap.data();
    if (!planSnap.exists || !plan || plan.instituteId !== institute.id) {
      throw new AuthError(404, "FEE_PLAN_NOT_FOUND", "Student fee plan not found.");
    }

    const totalSettlement = amountPaise + extraDiscountPaise;
    if (totalSettlement > plan.pendingPaise) {
      throw new AuthError(
        400,
        "OVERPAYMENT_NOT_ALLOWED",
        `Amount + discount (₹${(totalSettlement / 100).toFixed(2)}) exceeds pending balance (₹${(plan.pendingPaise / 100).toFixed(2)}).`
      );
    }

    const now = new Date().toISOString();
    const paymentId = generateId("FPY");
    const receiptId = generateId("FRC");
    const receiptNumber = formatReceiptNumber(institute.code, nextReceiptSeq);
    const nextPaid = plan.paidPaise + amountPaise;
    const nextDiscount = plan.discountPaise + extraDiscountPaise;
    const nextPending = plan.pendingPaise - totalSettlement;

    const payment: FeePaymentRecord = {
      id: paymentId,
      receiptNo: receiptNumber,
      instituteId: institute.id,
      feePlanId: plan.id,
      studentId: plan.studentId,
      studentName: plan.studentName,
      amountPaise,
      paymentMode:
        input.method === "razorpay"
          ? "upi"
          : input.method === "other"
            ? "bank_transfer"
            : input.method,
      note: input.reference?.trim() || input.feePeriod?.trim() || "Fee installment",
      collectedByUid: actor.uid,
      paidAt: now,
      createdAt: now,
    };

    const receipt: FeeReceiptRecord = {
      id: receiptId,
      receiptNumber,
      instituteId: institute.id,
      instituteName: institute.name,
      studentId: plan.studentId,
      studentCode: plan.studentCode,
      studentName: plan.studentName,
      courseName: plan.courseName,
      feePlanId: plan.id,
      paymentId,
      feePeriod: input.feePeriod?.trim() || "Installment",
      amountPaise,
      discountPaise: extraDiscountPaise,
      remainingDuesPaise: nextPending,
      paymentMethod: input.method,
      transactionRef: input.reference?.trim() || null,
      issuedByUid: actor.uid,
      status: "issued",
      issuedAt: now,
    };

    const updatedPlan: StudentFeePlanRecord = {
      ...plan,
      paidPaise: nextPaid,
      discountPaise: nextDiscount,
      pendingPaise: nextPending,
      updatedAt: now,
    };

    if (input.accountId) {
      const accRef = instituteAccountsCollection().doc(input.accountId);
      const accSnap = await tx.get(accRef);
      const acc = accSnap.data();
      if (accSnap.exists && acc && acc.instituteId === institute.id) {
        tx.update(accRef, {
          ledgerBalancePaise: acc.ledgerBalancePaise + amountPaise,
          updatedAt: now,
        });
      }
    }

    tx.update(planRef, {
      paidPaise: nextPaid,
      discountPaise: nextDiscount,
      pendingPaise: nextPending,
      updatedAt: now,
    });
    tx.set(feePaymentsCol().doc(paymentId), payment);
    tx.set(feeReceiptsCollection().doc(receiptId), receipt);

    return { payment, receipt, plan: updatedPlan };
  });

  // Create student notification after committed fee payment
  const studentSnap = await studentsCollection().doc(result.plan.studentId).get();
  const student = studentSnap.data();
  const notifId = generateId("NTF");
  await notificationsCol()
    .doc(notifId)
    .set({
      id: notifId,
      instituteId: institute.id,
      studentId: result.plan.studentId,
      studentUid: student?.uid ?? null,
      audience: "student",
      type: "fee_payment_received",
      title: `Fee Receipt ${result.receipt.receiptNumber}`,
      message: `Payment of ₹${(amountPaise / 100).toFixed(2)} received via ${input.method.toUpperCase()}. Remaining balance: ₹${(result.plan.pendingPaise / 100).toFixed(2)}.`,
      relatedResourceId: result.receipt.id,
      read: false,
      readAt: null,
      createdAt: result.receipt.issuedAt,
    });

  await recordAuditLog({
    action: "FEE_PAYMENT_COLLECTED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: result.payment.id,
    metadata: {
      receiptNumber: result.receipt.receiptNumber,
      studentId: result.plan.studentId,
      amountPaise,
      method: input.method,
    },
  });

  return result;
}

export async function refundInstituteFee(
  actor: SessionUser,
  input: {
    paymentId: string;
    amountRupees: number;
    reason: string;
    method: FeePaymentMethod;
  }
): Promise<FeeRefundRecord> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  if (!input.reason || input.reason.trim().length < 5) {
    throw new AuthError(
      400,
      "REASON_REQUIRED",
      "Refund reason (min 5 chars) is required."
    );
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const amountPaise = Math.round(input.amountRupees * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AuthError(400, "INVALID_AMOUNT", "Refund amount must be positive.");
  }

  const db = getAdminFirestore();
  const payRef = feePaymentsCol().doc(input.paymentId);
  const receiptSnap = await feeReceiptsCollection()
    .where("instituteId", "==", institute.id)
    .where("paymentId", "==", input.paymentId)
    .limit(1)
    .get();
  const origReceipt = receiptSnap.docs[0]?.data();

  const refundRecord = await db.runTransaction(async (tx) => {
    const paySnap = await tx.get(payRef);
    const payment = paySnap.data();
    if (!paySnap.exists || !payment || payment.instituteId !== institute.id) {
      throw new AuthError(404, "PAYMENT_NOT_FOUND", "Original fee payment not found.");
    }
    if (amountPaise > payment.amountPaise) {
      throw new AuthError(
        400,
        "REFUND_EXCEEDS_PAYMENT",
        "Refund amount cannot exceed original payment."
      );
    }

    const planRef = feePlansCol().doc(payment.feePlanId);
    const planSnap = await tx.get(planRef);
    const plan = planSnap.data();
    if (!planSnap.exists || !plan) {
      throw new AuthError(404, "FEE_PLAN_NOT_FOUND", "Linked fee plan not found.");
    }

    const now = new Date().toISOString();
    const refundId = generateId("FRF");
    const refund: FeeRefundRecord = {
      id: refundId,
      instituteId: institute.id,
      studentId: plan.studentId,
      studentCode: plan.studentCode,
      studentName: plan.studentName,
      feePlanId: plan.id,
      originalPaymentId: payment.id,
      originalReceiptNumber: origReceipt?.receiptNumber ?? null,
      amountPaise,
      reason: input.reason.trim(),
      paymentMethod: input.method,
      actorUid: actor.uid,
      createdAt: now,
    };

    const nextPaid = Math.max(0, plan.paidPaise - amountPaise);
    const nextPending = plan.pendingPaise + amountPaise;

    tx.update(planRef, {
      paidPaise: nextPaid,
      pendingPaise: nextPending,
      updatedAt: now,
    });
    tx.set(feeRefundsCollection().doc(refundId), refund);

    return refund;
  });

  const notifId = generateId("NTF");
  await notificationsCol()
    .doc(notifId)
    .set({
      id: notifId,
      instituteId: institute.id,
      studentId: refundRecord.studentId,
      audience: "student",
      type: "refund_processed",
      title: "Fee Refund Recorded",
      message: `A refund of ₹${(amountPaise / 100).toFixed(2)} was processed (${refundRecord.reason}).`,
      relatedResourceId: refundRecord.id,
      read: false,
      readAt: null,
      createdAt: refundRecord.createdAt,
    });

  await recordAuditLog({
    action: "FEE_REFUND_PROCESSED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: refundRecord.id,
    metadata: {
      originalPaymentId: input.paymentId,
      amountPaise,
      reason: refundRecord.reason,
    },
  });

  return refundRecord;
}

export async function listFinanceAccountsAndLedger(actor: SessionUser) {
  if (!hasStaffPermission(actor, "fees:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);

  const [catSnap, accSnap, entriesSnap] = await Promise.all([
    instituteCategoriesCollection().where("instituteId", "==", institute.id).get(),
    instituteAccountsCollection().where("instituteId", "==", institute.id).get(),
    instituteLedgerEntriesCollection().where("instituteId", "==", institute.id).get(),
  ]);

  return {
    categories: catSnap.docs
      .map((d) => d.data())
      .sort((a, b) => a.name.localeCompare(b.name)),
    accounts: accSnap.docs
      .map((d) => d.data())
      .sort((a, b) => a.name.localeCompare(b.name)),
    entries: entriesSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function createFinanceCategory(
  actor: SessionUser,
  input: {
    name: string;
    type: "income" | "expense";
    description?: string | undefined;
  }
): Promise<InstituteCategoryRecord> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const id = generateId("CAT");
  const record: InstituteCategoryRecord = {
    id,
    instituteId: institute.id,
    name: input.name.trim(),
    type: input.type,
    status: "active",
    description: input.description?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
  await instituteCategoriesCollection().doc(id).set(record);
  return record;
}

export async function deleteFinanceCategory(actor: SessionUser, categoryId: string) {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const catSnap = await instituteCategoriesCollection().doc(categoryId).get();
  const cat = catSnap.data();
  if (!catSnap.exists || !cat || cat.instituteId !== institute.id) {
    throw new AuthError(404, "CATEGORY_NOT_FOUND", "Category not found.");
  }

  const refSnap = await instituteLedgerEntriesCollection()
    .where("instituteId", "==", institute.id)
    .where("categoryId", "==", categoryId)
    .limit(1)
    .get();
  if (!refSnap.empty) {
    throw new AuthError(
      409,
      "CATEGORY_IN_USE",
      "Cannot delete category referenced by historical transactions."
    );
  }

  await instituteCategoriesCollection().doc(categoryId).delete();
}

export async function createFinanceAccount(
  actor: SessionUser,
  input: {
    name: string;
    accountType: "cash" | "bank" | "upi";
    openingBalanceRupees?: number | undefined;
  }
): Promise<InstituteAccountRecord> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const openingPaise = Math.max(0, Math.round((input.openingBalanceRupees ?? 0) * 100));
  const now = new Date().toISOString();
  const id = generateId("ACC");
  const record: InstituteAccountRecord = {
    id,
    instituteId: institute.id,
    name: input.name.trim(),
    accountType: input.accountType,
    openingBalancePaise: openingPaise,
    ledgerBalancePaise: openingPaise,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await instituteAccountsCollection().doc(id).set(record);
  return record;
}

export async function recordLedgerEntry(
  actor: SessionUser,
  input: {
    entryType: "income" | "expense" | "transfer";
    date: string;
    categoryId?: string | undefined;
    categoryName?: string | undefined;
    description: string;
    vendorOrPayee?: string | undefined;
    amountRupees: number;
    paymentMethod: FeePaymentMethod;
    accountId: string;
    toAccountId?: string | undefined;
    reference?: string | undefined;
  }
): Promise<InstituteLedgerEntryRecord> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const amountPaise = Math.round(input.amountRupees * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AuthError(400, "INVALID_AMOUNT", "Entry amount must be positive.");
  }
  if (
    input.entryType === "transfer" &&
    (!input.toAccountId || input.toAccountId === input.accountId)
  ) {
    throw new AuthError(
      400,
      "INVALID_TRANSFER",
      "Select a distinct destination account."
    );
  }

  const db = getAdminFirestore();
  const entry = await db.runTransaction(async (tx) => {
    const srcRef = instituteAccountsCollection().doc(input.accountId);
    const srcSnap = await tx.get(srcRef);
    const src = srcSnap.data();
    if (!srcSnap.exists || !src || src.instituteId !== institute.id) {
      throw new AuthError(
        404,
        "ACCOUNT_NOT_FOUND",
        "Selected cash/bank account not found."
      );
    }

    const now = new Date().toISOString();
    if (input.entryType === "income") {
      tx.update(srcRef, {
        ledgerBalancePaise: src.ledgerBalancePaise + amountPaise,
        updatedAt: now,
      });
    } else if (input.entryType === "expense") {
      tx.update(srcRef, {
        ledgerBalancePaise: src.ledgerBalancePaise - amountPaise,
        updatedAt: now,
      });
    } else if (input.entryType === "transfer" && input.toAccountId) {
      const dstRef = instituteAccountsCollection().doc(input.toAccountId);
      const dstSnap = await tx.get(dstRef);
      const dst = dstSnap.data();
      if (!dstSnap.exists || !dst || dst.instituteId !== institute.id) {
        throw new AuthError(404, "ACCOUNT_NOT_FOUND", "Destination account not found.");
      }
      tx.update(srcRef, {
        ledgerBalancePaise: src.ledgerBalancePaise - amountPaise,
        updatedAt: now,
      });
      tx.update(dstRef, {
        ledgerBalancePaise: dst.ledgerBalancePaise + amountPaise,
        updatedAt: now,
      });
    }

    const id = generateId("LED");
    const doc: InstituteLedgerEntryRecord = {
      id,
      instituteId: institute.id,
      entryType: input.entryType,
      date: input.date || now.slice(0, 10),
      categoryId: input.categoryId ?? null,
      categoryName:
        input.categoryName?.trim() ||
        (input.entryType === "transfer" ? "Account Transfer" : "General"),
      description: input.description.trim(),
      vendorOrPayee: input.vendorOrPayee?.trim() || null,
      amountPaise,
      paymentMethod: input.paymentMethod,
      accountId: input.accountId,
      toAccountId: input.toAccountId ?? null,
      reference: input.reference?.trim() || null,
      status: "posted",
      createdByUid: actor.uid,
      createdAt: now,
    };

    tx.set(instituteLedgerEntriesCollection().doc(id), doc);
    return doc;
  });

  await recordAuditLog({
    action: "LEDGER_ENTRY_POSTED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: entry.id,
    metadata: {
      entryType: input.entryType,
      amountPaise,
      accountId: input.accountId,
      category: entry.categoryName,
    },
  });

  return entry;
}
