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

export type FinanceDateRangeKey =
  "today" | "week" | "month" | "last_month" | "fy" | "all" | "custom";

function resolveDateBounds(
  range: FinanceDateRangeKey = "month",
  customFrom?: string,
  customTo?: string
): { startIso: string; endIso: string } {
  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
  if (range === "all") {
    return {
      startIso: "1970-01-01T00:00:00.000Z",
      endIso: "2099-12-31T23:59:59.999Z",
    };
  }
  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: endOfToday.toISOString() };
  }
  if (range === "week") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0
    );
    return { startIso: start.toISOString(), endIso: endOfToday.toISOString() };
  }
  if (range === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }
  if (range === "fy") {
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: endOfToday.toISOString() };
  }
  if (range === "custom" && customFrom && customTo) {
    return {
      startIso: `${customFrom.slice(0, 10)}T00:00:00.000Z`,
      endIso: `${customTo.slice(0, 10)}T23:59:59.999Z`,
    };
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { startIso: monthStart.toISOString(), endIso: endOfToday.toISOString() };
}

export async function getInstituteFinanceOverview(
  actor: SessionUser,
  filter: {
    range?: FinanceDateRangeKey | undefined;
    from?: string | undefined;
    to?: string | undefined;
  } = {}
) {
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
  let accounts = accountsSnap.docs.map((d) => d.data());
  if (accounts.length === 0) {
    accounts = await ensureDefaultInstituteAccounts(institute.id);
  }

  const rangeKey = filter.range ?? "month";
  const { startIso, endIso } = resolveDateBounds(rangeKey, filter.from, filter.to);
  const inRange = (iso: string) => iso >= startIso && iso <= endIso;

  const activeReceipts = receipts.filter((r) => r.status !== "cancelled");
  const rangedReceipts = activeReceipts.filter((r) => inRange(r.issuedAt));

  const now = new Date();
  const todayPrefix = now.toISOString().slice(0, 10);
  const monthPrefix = now.toISOString().slice(0, 7);

  let todayCollectionPaise = 0;
  let monthCollectionPaise = 0;
  let periodCollectionPaise = 0;
  const methodTotalsPaise: Record<string, number> = {};
  const dailyCollectionMap = new Map<string, number>();
  const dailyIncomeMap = new Map<string, number>();
  const dailyExpenseMap = new Map<string, number>();

  for (const r of activeReceipts) {
    if (r.issuedAt.startsWith(todayPrefix)) {
      todayCollectionPaise += r.amountPaise;
    }
    if (r.issuedAt.startsWith(monthPrefix)) {
      monthCollectionPaise += r.amountPaise;
    }
  }

  for (const r of rangedReceipts) {
    periodCollectionPaise += r.amountPaise;
    const method = r.paymentMethod ?? "cash";
    methodTotalsPaise[method] = (methodTotalsPaise[method] ?? 0) + r.amountPaise;
    const day = r.issuedAt.slice(0, 10);
    dailyCollectionMap.set(day, (dailyCollectionMap.get(day) ?? 0) + r.amountPaise);
    dailyIncomeMap.set(day, (dailyIncomeMap.get(day) ?? 0) + r.amountPaise);
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

  const rangedRefunds = refunds.filter((r) => inRange(r.createdAt));
  const totalRefundedPaise = rangedRefunds.reduce((sum, r) => sum + r.amountPaise, 0);

  const rangedIncomeEntries = ledgerEntries.filter(
    (e) =>
      e.entryType === "income" && e.status === "posted" && inRange(e.date || e.createdAt)
  );
  const rangedExpenseEntries = ledgerEntries.filter(
    (e) =>
      e.entryType === "expense" && e.status === "posted" && inRange(e.date || e.createdAt)
  );

  for (const e of rangedIncomeEntries) {
    const day = (e.date || e.createdAt).slice(0, 10);
    dailyIncomeMap.set(day, (dailyIncomeMap.get(day) ?? 0) + e.amountPaise);
  }
  for (const e of rangedExpenseEntries) {
    const day = (e.date || e.createdAt).slice(0, 10);
    dailyExpenseMap.set(day, (dailyExpenseMap.get(day) ?? 0) + e.amountPaise);
  }

  const otherIncomePaise = rangedIncomeEntries.reduce((sum, e) => sum + e.amountPaise, 0);
  const totalExpensesPaise = rangedExpenseEntries.reduce(
    (sum, e) => sum + e.amountPaise,
    0
  );
  const totalFeesCollectedPaise = activeReceipts.reduce(
    (sum, r) => sum + r.amountPaise,
    0
  );

  const allDays = Array.from(
    new Set([
      ...dailyCollectionMap.keys(),
      ...dailyIncomeMap.keys(),
      ...dailyExpenseMap.keys(),
    ])
  ).sort();

  const collectionTrend = allDays.map((day) => ({
    label: day.slice(5),
    date: day,
    amountPaise: dailyCollectionMap.get(day) ?? 0,
  }));

  const incomeVsExpenseTrend = allDays.map((day) => ({
    label: day.slice(5),
    date: day,
    incomePaise: dailyIncomeMap.get(day) ?? 0,
    expensePaise: dailyExpenseMap.get(day) ?? 0,
  }));

  return {
    instituteId: institute.id,
    instituteName: institute.name,
    range: rangeKey,
    todayCollectionPaise,
    monthCollectionPaise,
    periodCollectionPaise,
    totalFeesCollectedPaise,
    totalOutstandingPaise,
    totalRefundedPaise,
    paidStudents,
    partialStudents,
    pendingStudents,
    otherIncomePaise,
    totalExpensesPaise,
    operationalSurplusPaise:
      periodCollectionPaise + otherIncomePaise - totalRefundedPaise - totalExpensesPaise,
    methodTotalsPaise,
    collectionTrend,
    incomeVsExpenseTrend,
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
    feePlanId?: string | undefined;
    studentId?: string | undefined;
    totalFeeRupees?: number | undefined;
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

  let resolvedPlanId = input.feePlanId?.trim() || "";
  if (!resolvedPlanId && input.studentId) {
    const existingForStudent = await feePlansCol()
      .where("instituteId", "==", institute.id)
      .where("studentId", "==", input.studentId)
      .limit(1)
      .get();

    if (!existingForStudent.empty && existingForStudent.docs[0]) {
      resolvedPlanId = existingForStudent.docs[0].id;
    } else {
      const { studentsCollection } = await import("@/lib/firebase/firestore");
      const stSnap = await studentsCollection().doc(input.studentId).get();
      const st = stSnap.data();
      if (!stSnap.exists || !st || st.instituteId !== institute.id) {
        throw new AuthError(404, "STUDENT_NOT_FOUND", "Selected student not found.");
      }
      const { getAdminFirestore: getDb } = await import("@/lib/firebase/admin");
      const coursesSnap = st.courseId
        ? await getDb().collection("courses").doc(st.courseId).get()
        : null;
      const matchedCourse = coursesSnap?.exists
        ? (coursesSnap.data() as {
            feePaise?: number;
            monthlyFeePaise?: number;
            durationMonths?: number;
            admissionFeePaise?: number;
          })
        : null;

      const courseDefaultPaise = matchedCourse?.feePaise ?? 0;
      const totalPaise = Math.max(
        amountPaise + extraDiscountPaise,
        input.totalFeeRupees
          ? Math.round(input.totalFeeRupees * 100)
          : courseDefaultPaise > 0
            ? courseDefaultPaise
            : amountPaise
      );
      const newPlanId = generateId("FPL");
      const nowIso = new Date().toISOString();
      const newPlan: StudentFeePlanRecord = {
        id: newPlanId,
        instituteId: institute.id,
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.fullName,
        courseName: st.courseName,
        totalFeePaise: totalPaise,
        ...(matchedCourse?.monthlyFeePaise
          ? { monthlyFeePaise: matchedCourse.monthlyFeePaise }
          : {}),
        ...(matchedCourse?.durationMonths
          ? { durationMonths: matchedCourse.durationMonths }
          : {}),
        ...(matchedCourse?.admissionFeePaise
          ? { admissionFeePaise: matchedCourse.admissionFeePaise }
          : {}),
        startDate: st.admissionDate || st.createdAt || nowIso,
        discountPaise: 0,
        paidPaise: 0,
        pendingPaise: totalPaise,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await feePlansCol().doc(newPlanId).set(newPlan);
      resolvedPlanId = newPlanId;
    }
  }

  if (!resolvedPlanId) {
    throw new AuthError(400, "VALIDATION_ERROR", "Select a student or fee plan.");
  }

  const db = getAdminFirestore();
  const planRef = feePlansCol().doc(resolvedPlanId);
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

    let resolvedAccountId: string | null = input.accountId ?? null;
    if (!resolvedAccountId) {
      const accsSnap = await instituteAccountsCollection()
        .where("instituteId", "==", institute.id)
        .get();
      const wantType = input.method === "cash" ? "cash" : "bank";
      const activeAccs = accsSnap.docs
        .map((d) => d.data())
        .filter((a) => a.status === "active");
      resolvedAccountId =
        activeAccs.find((a) => a.accountType === wantType)?.id ??
        activeAccs[0]?.id ??
        null;
    }

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
      accountId: resolvedAccountId,
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

    if (resolvedAccountId) {
      const accRef = instituteAccountsCollection().doc(resolvedAccountId);
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

  let accounts = accSnap.docs
    .map((d) => d.data())
    .sort((a, b) => a.name.localeCompare(b.name));
  if (accounts.length === 0) {
    accounts = await ensureDefaultInstituteAccounts(institute.id);
  }

  return {
    categories: catSnap.docs
      .map((d) => d.data())
      .sort((a, b) => a.name.localeCompare(b.name)),
    accounts,
    entries: entriesSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function ensureDefaultInstituteAccounts(
  instituteId: string
): Promise<InstituteAccountRecord[]> {
  const existing = await instituteAccountsCollection()
    .where("instituteId", "==", instituteId)
    .limit(1)
    .get();
  if (!existing.empty) {
    const all = await instituteAccountsCollection()
      .where("instituteId", "==", instituteId)
      .get();
    return all.docs.map((d) => d.data());
  }

  const now = new Date().toISOString();
  const cashAcc: InstituteAccountRecord = {
    id: generateId("ACC"),
    instituteId,
    name: "Cash Account",
    accountType: "cash",
    openingBalancePaise: 0,
    ledgerBalancePaise: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  const bankAcc: InstituteAccountRecord = {
    id: generateId("ACC"),
    instituteId,
    name: "Bank Account",
    accountType: "bank",
    openingBalancePaise: 0,
    ledgerBalancePaise: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const db = getAdminFirestore();
  const batch = db.batch();
  batch.set(instituteAccountsCollection().doc(cashAcc.id), cashAcc);
  batch.set(instituteAccountsCollection().doc(bankAcc.id), bankAcc);
  await batch.commit();

  return [bankAcc, cashAcc];
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

export async function updateFinanceAccount(
  actor: SessionUser,
  accountId: string,
  input: {
    name?: string | undefined;
    accountType?: "cash" | "bank" | "upi" | undefined;
    status?: "active" | "inactive" | undefined;
  }
): Promise<InstituteAccountRecord> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = instituteAccountsCollection().doc(accountId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
  }

  const updated: InstituteAccountRecord = {
    ...existing,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.accountType ? { accountType: input.accountType } : {}),
    ...(input.status ? { status: input.status } : {}),
    updatedAt: new Date().toISOString(),
  };
  await ref.set(updated);

  await recordAuditLog({
    action: "ACCOUNT_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: accountId,
    metadata: { name: updated.name, status: updated.status },
  });
  return updated;
}

export async function deleteFinanceAccount(
  actor: SessionUser,
  accountId: string,
  reason = "Deleted by administrator"
) {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = instituteAccountsCollection().doc(accountId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
  }

  const [ledgerSnap, toLedgerSnap, receiptsSnap] = await Promise.all([
    instituteLedgerEntriesCollection()
      .where("instituteId", "==", institute.id)
      .where("accountId", "==", accountId)
      .limit(1)
      .get(),
    instituteLedgerEntriesCollection()
      .where("instituteId", "==", institute.id)
      .where("toAccountId", "==", accountId)
      .limit(1)
      .get(),
    feeReceiptsCollection()
      .where("instituteId", "==", institute.id)
      .where("accountId", "==", accountId)
      .limit(1)
      .get(),
  ]);

  if (!ledgerSnap.empty || !toLedgerSnap.empty || !receiptsSnap.empty) {
    throw new AuthError(
      409,
      "ACCOUNT_IN_USE",
      `Cannot delete "${existing.name}" because it has linked transactions. Deactivate the account instead.`
    );
  }

  await ref.delete();
  await recordAuditLog({
    action: "ACCOUNT_DELETED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: accountId,
    metadata: { name: existing.name, reason: reason.trim() },
  });
  return { deleted: true, accountId };
}

export async function reverseLedgerEntry(
  actor: SessionUser,
  entryId: string,
  reason: string
) {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const db = getAdminFirestore();
  const entryRef = instituteLedgerEntriesCollection().doc(entryId);
  const now = new Date().toISOString();

  const reversed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(entryRef);
    const entry = snap.data();
    if (!snap.exists || !entry || entry.instituteId !== institute.id) {
      throw new AuthError(404, "ENTRY_NOT_FOUND", "Ledger entry not found.");
    }
    if (entry.status === "reversed") {
      throw new AuthError(
        409,
        "ALREADY_REVERSED",
        "This ledger entry has already been reversed."
      );
    }

    const accRef = instituteAccountsCollection().doc(entry.accountId);
    const accSnap = await tx.get(accRef);
    const acc = accSnap.data();

    if (accSnap.exists && acc) {
      if (entry.entryType === "income") {
        tx.update(accRef, {
          ledgerBalancePaise: acc.ledgerBalancePaise - entry.amountPaise,
          updatedAt: now,
        });
      } else if (entry.entryType === "expense") {
        tx.update(accRef, {
          ledgerBalancePaise: acc.ledgerBalancePaise + entry.amountPaise,
          updatedAt: now,
        });
      } else if (entry.entryType === "transfer" && entry.toAccountId) {
        const toRef = instituteAccountsCollection().doc(entry.toAccountId);
        const toSnap = await tx.get(toRef);
        const toAcc = toSnap.data();
        tx.update(accRef, {
          ledgerBalancePaise: acc.ledgerBalancePaise + entry.amountPaise,
          updatedAt: now,
        });
        if (toSnap.exists && toAcc) {
          tx.update(toRef, {
            ledgerBalancePaise: toAcc.ledgerBalancePaise - entry.amountPaise,
            updatedAt: now,
          });
        }
      }
    }

    tx.update(entryRef, {
      status: "reversed",
      reference: `${entry.reference ?? ""} [DELETED: ${reason.trim()}]`.trim(),
    });

    return entry;
  });

  await recordAuditLog({
    action: "LEDGER_ENTRY_REVERSED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: entryId,
    metadata: {
      entryType: reversed.entryType,
      amountPaise: reversed.amountPaise,
      reason: reason.trim(),
    },
  });

  return { reversed: true, entryId };
}

export async function cancelInstituteReceipt(
  actor: SessionUser,
  input: {
    receiptId?: string | undefined;
    paymentId?: string | undefined;
    reason: string;
  }
) {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const db = getAdminFirestore();

  let targetReceiptId = input.receiptId?.trim() || "";
  if (!targetReceiptId && input.paymentId) {
    const byPayment = await feeReceiptsCollection()
      .where("instituteId", "==", institute.id)
      .where("paymentId", "==", input.paymentId)
      .limit(1)
      .get();
    if (!byPayment.empty && byPayment.docs[0]) {
      targetReceiptId = byPayment.docs[0].id;
    }
  }

  if (!targetReceiptId) {
    throw new AuthError(404, "RECEIPT_NOT_FOUND", "Linked fee receipt not found.");
  }

  const receiptRef = feeReceiptsCollection().doc(targetReceiptId);
  const now = new Date().toISOString();
  const reversalRef = `REV-${Date.now().toString().slice(-6)}`;

  const result = await db.runTransaction(async (tx) => {
    const receiptSnap = await tx.get(receiptRef);
    const receipt = receiptSnap.data();
    if (!receiptSnap.exists || !receipt || receipt.instituteId !== institute.id) {
      throw new AuthError(404, "RECEIPT_NOT_FOUND", "Fee receipt not found.");
    }
    if (receipt.status === "cancelled") {
      throw new AuthError(
        409,
        "ALREADY_REVERSED",
        "This fee transaction/receipt has already been reversed."
      );
    }

    const planRef = feePlansCol().doc(receipt.feePlanId);
    const planSnap = await tx.get(planRef);
    const plan = planSnap.data();
    if (!planSnap.exists || !plan || plan.instituteId !== institute.id) {
      throw new AuthError(
        404,
        "FEE_PLAN_NOT_FOUND",
        "Linked student fee plan not found."
      );
    }

    const nextPaidPaise = Math.max(0, plan.paidPaise - receipt.amountPaise);
    const netPayable = Math.max(0, plan.totalFeePaise - plan.discountPaise);
    const nextPendingPaise = Math.max(0, netPayable - nextPaidPaise);

    if (receipt.accountId) {
      const accRef = instituteAccountsCollection().doc(receipt.accountId);
      const accSnap = await tx.get(accRef);
      const acc = accSnap.data();
      if (accSnap.exists && acc && acc.instituteId === institute.id) {
        tx.update(accRef, {
          ledgerBalancePaise: acc.ledgerBalancePaise - receipt.amountPaise,
          updatedAt: now,
        });
      }
    }

    tx.update(receiptRef, {
      status: "cancelled",
      reversalRef,
      reversedAt: now,
      reversedByUid: actor.uid,
      reversalReason: input.reason.trim(),
    });

    tx.update(planRef, {
      paidPaise: nextPaidPaise,
      pendingPaise: nextPendingPaise,
      updatedAt: now,
    });

    if (receipt.paymentId) {
      const paymentRef = feePaymentsCol().doc(receipt.paymentId);
      const paymentSnap = await tx.get(paymentRef);
      if (paymentSnap.exists) {
        tx.update(paymentRef, {
          status: "reversed",
          reversalRef,
          note: `${paymentSnap.data()?.note ?? ""} [REVERSED: ${reversalRef}]`.trim(),
        });
      }
    }

    return {
      receiptId: receipt.id,
      paymentId: receipt.paymentId,
      receiptNumber: receipt.receiptNumber,
      studentId: receipt.studentId,
      studentName: receipt.studentName,
      amountPaise: receipt.amountPaise,
      reversalRef,
      nextPaidPaise,
      nextPendingPaise,
    };
  });

  await recordAuditLog({
    action: "FEE_RECEIPT_REVERSED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: result.receiptId,
    metadata: {
      receiptNumber: result.receiptNumber,
      paymentId: result.paymentId,
      reversalRef: result.reversalRef,
      amountPaise: result.amountPaise,
      reason: input.reason.trim(),
      nextPendingPaise: result.nextPendingPaise,
    },
  });

  return result;
}
