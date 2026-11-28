import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { studentsCollection } from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import type { SessionUser } from "@/types/auth";
import type { FeePaymentRecord, StudentFeePlanRecord } from "@/types/academic";

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

export async function listInstituteFees(actor: SessionUser) {
  if (!hasStaffPermission(actor, "fees:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);

  const [plansSnap, paymentsSnap] = await Promise.all([
    feePlansCol().where("instituteId", "==", institute.id).get(),
    feePaymentsCol().where("instituteId", "==", institute.id).get(),
  ]);

  return {
    plans: plansSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payments: paymentsSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100),
  };
}

export async function createStudentFeePlan(
  actor: SessionUser,
  input: {
    studentId: string;
    totalFeeRupees: number;
    discountRupees: number;
  }
): Promise<StudentFeePlanRecord> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);

  const studentSnap = await studentsCollection().doc(input.studentId).get();
  const student = studentSnap.data();
  if (!studentSnap.exists || !student || student.instituteId !== institute.id) {
    throw new AuthError(404, "STUDENT_NOT_FOUND", "Student not found.");
  }

  const totalFeePaise = Math.round(input.totalFeeRupees * 100);
  const discountPaise = Math.round(input.discountRupees * 100);
  if (discountPaise > totalFeePaise) {
    throw new AuthError(
      400,
      "INVALID_DISCOUNT",
      "Discount cannot exceed total course fee."
    );
  }

  const id = generateId("FPL");
  const now = new Date().toISOString();
  const record: StudentFeePlanRecord = {
    id,
    instituteId: institute.id,
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.fullName,
    courseName: student.courseName,
    totalFeePaise,
    discountPaise,
    paidPaise: 0,
    pendingPaise: totalFeePaise - discountPaise,
    createdAt: now,
    updatedAt: now,
  };

  await feePlansCol().doc(id).set(record);
  return record;
}

export async function collectStudentFeePayment(
  actor: SessionUser,
  input: {
    feePlanId: string;
    amountRupees: number;
    paymentMode: "cash" | "upi" | "bank_transfer" | "card";
    note: string;
  }
): Promise<{ plan: StudentFeePlanRecord; payment: FeePaymentRecord }> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const amountPaise = Math.round(input.amountRupees * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AuthError(400, "INVALID_AMOUNT", "Payment amount must be positive.");
  }

  const db = getAdminFirestore();
  const planRef = feePlansCol().doc(input.feePlanId);
  const paymentId = generateId("FPM");
  const receiptNo = `RCPT-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  return db
    .runTransaction(async (tx) => {
      const planSnap = await tx.get(planRef);
      const plan = planSnap.data();

      if (!planSnap.exists || !plan || plan.instituteId !== institute.id) {
        throw new AuthError(404, "FEE_PLAN_NOT_FOUND", "Student fee plan not found.");
      }
      if (amountPaise > plan.pendingPaise) {
        throw new AuthError(
          400,
          "OVERPAYMENT",
          `Payment exceeds pending balance (₹${(plan.pendingPaise / 100).toFixed(2)}).`
        );
      }

      const updatedPlan: StudentFeePlanRecord = {
        ...plan,
        paidPaise: plan.paidPaise + amountPaise,
        pendingPaise: plan.pendingPaise - amountPaise,
        updatedAt: now,
      };

      const paymentRecord: FeePaymentRecord = {
        id: paymentId,
        receiptNo,
        instituteId: institute.id,
        feePlanId: plan.id,
        studentId: plan.studentId,
        studentName: plan.studentName,
        amountPaise,
        paymentMode: input.paymentMode,
        note: input.note,
        collectedByUid: actor.uid,
        paidAt: now,
        createdAt: now,
      };

      tx.set(planRef, updatedPlan);
      tx.set(feePaymentsCol().doc(paymentId), paymentRecord);

      return { plan: updatedPlan, payment: paymentRecord };
    })
    .then(async (res) => {
      const { syncStudentFeeRemindersAfterPayment } =
        await import("./fee-reminder.service");
      await syncStudentFeeRemindersAfterPayment(institute.id, res.plan.studentId).catch(
        () => undefined
      );
      return res;
    });
}
