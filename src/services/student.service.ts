import "server-only";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
  admissionOperationsCollection,
  auditLogsCollection,
  institutesCollection,
  loginMappingsCollection,
  studentsCollection,
  usersCollection,
} from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId, generateStudentCode } from "@/lib/utils/ids";
import { generateTemporaryPassword } from "@/lib/utils/password";
import { recordAuditLog } from "./audit.service";
import {
  applyWalletDebitInTransaction,
  InsufficientWalletBalanceError,
  resolveWalletBuckets,
} from "./wallet.service";
import { validateCourseAndBatchRelationship } from "./academic.service";
import type { AdmitStudentInput, UpdateStudentInput } from "@/lib/validation/student";
import type { SessionUser } from "@/types/auth";
import type { BatchRecord, CourseRecord } from "@/types/academic";
import type { StudentRecord } from "@/types/domain";

export async function listInstituteStudents(
  actor: SessionUser,
  includeDeleted = false
): Promise<StudentRecord[]> {
  if (!hasStaffPermission(actor, "students:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await studentsCollection().where("instituteId", "==", institute.id).get();
  return snap.docs
    .map((d) => d.data())
    .filter((s) => includeDeleted || s.status !== "deleted")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200);
}

export async function listInstituteStudentsPaginated(
  actor: SessionUser,
  filter: {
    search?: string | undefined;
    status?: "all" | "active" | "disabled" | "deleted" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
  } = {}
) {
  let items = await listInstituteStudents(actor, filter.status === "deleted");

  if (filter.status && filter.status !== "all") {
    items = items.filter((s) => s.status === filter.status);
  }
  if (filter.search) {
    const q = filter.search.trim().toLowerCase();
    items = items.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.courseName.toLowerCase().includes(q) ||
        s.batchName.toLowerCase().includes(q)
    );
  }

  const pageSize = Math.min(Math.max(filter.pageSize ?? 15, 1), 50);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
  const offset = (page - 1) * pageSize;

  return {
    items: items.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getStudentAuditHistory(actor: SessionUser, studentId: string) {
  const student = await getInstituteStudentById(actor, studentId);
  const snap = await auditLogsCollection().where("targetId", "==", student.id).get();
  return snap.docs
    .map((d) => d.data())
    .filter((log) => log.instituteId === student.instituteId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 25);
}

export async function getInstituteStudentById(
  actor: SessionUser,
  studentId: string
): Promise<StudentRecord> {
  if (!hasStaffPermission(actor, "students:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await studentsCollection().doc(studentId).get();
  const student = snap.data();

  if (!snap.exists || !student || student.instituteId !== institute.id) {
    throw new AuthError(404, "STUDENT_NOT_FOUND", "Student not found.");
  }
  return student;
}

export const CHARGEABLE_PROFILE_FIELDS = [
  "fullName",
  "courseName",
  "batchName",
  "courseId",
  "batchId",
] as const;

/**
 * Pure helper to detect which configured chargeable profile fields changed.
 * Non-chargeable fields (phone, address, guardianName, guardianPhone) never trigger a fee.
 * Exported for unit testing.
 */
export function detectChargeableProfileChanges(
  existing: Pick<
    StudentRecord,
    "fullName" | "courseName" | "batchName" | "courseId" | "batchId"
  >,
  input: Pick<
    UpdateStudentInput,
    "fullName" | "courseName" | "batchName" | "courseId" | "batchId"
  >
): Array<{ field: string; before: string | null; after: string | null }> {
  const changes: Array<{ field: string; before: string | null; after: string | null }> =
    [];
  if (existing.fullName.trim() !== input.fullName.trim()) {
    changes.push({
      field: "fullName",
      before: existing.fullName,
      after: input.fullName.trim(),
    });
  }
  if (existing.courseName.trim() !== input.courseName.trim()) {
    changes.push({
      field: "courseName",
      before: existing.courseName,
      after: input.courseName.trim(),
    });
  }
  if (existing.batchName.trim() !== input.batchName.trim()) {
    changes.push({
      field: "batchName",
      before: existing.batchName,
      after: input.batchName.trim(),
    });
  }
  if ((existing.courseId ?? null) !== (input.courseId ?? null)) {
    changes.push({
      field: "courseId",
      before: existing.courseId ?? null,
      after: input.courseId ?? null,
    });
  }
  if ((existing.batchId ?? null) !== (input.batchId ?? null)) {
    changes.push({
      field: "batchId",
      before: existing.batchId ?? null,
      after: input.batchId ?? null,
    });
  }
  return changes;
}

export async function admitStudent(
  actor: SessionUser,
  input: AdmitStudentInput
): Promise<{
  student: StudentRecord;
  credentials: {
    studentCode: string;
    loginEmail: string;
    temporaryPassword: string;
  } | null;
  walletBalancePaise: number;
  alreadyProcessed?: boolean;
}> {
  if (!hasStaffPermission(actor, "students:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:write permission.");
  }

  const institute = await resolveAuthorizedInstitute(actor);
  const admissionFeePaise = institute.pricing.admissionFeePaise;
  const wallet = resolveWalletBuckets(institute);

  const idempotencyKey = input.idempotencyKey?.trim() || generateId("ADM_OP");
  const opDocId = `${institute.id}_${idempotencyKey}`;
  const opRef = admissionOperationsCollection().doc(opDocId);

  const existingOpSnap = await opRef.get();
  const existingOp = existingOpSnap.data();
  if (existingOpSnap.exists && existingOp) {
    if (existingOp.status === "completed" && existingOp.studentId) {
      const existingStudentSnap = await studentsCollection()
        .doc(existingOp.studentId)
        .get();
      const existingStudent = existingStudentSnap.data();
      if (existingStudent) {
        return {
          student: existingStudent,
          credentials: null,
          walletBalancePaise: wallet.totalSpendableBalancePaise,
          alreadyProcessed: true,
        };
      }
    }
    if (existingOp.status === "pending" || existingOp.status === "auth_created") {
      throw new AuthError(
        409,
        "ADMISSION_IN_PROGRESS",
        "An admission with this idempotency key is already in progress."
      );
    }
  }

  if (wallet.totalSpendableBalancePaise < admissionFeePaise) {
    throw new InsufficientWalletBalanceError(
      admissionFeePaise,
      wallet.totalSpendableBalancePaise
    );
  }

  const normalizedEmail = input.email.toLowerCase();
  const studentId = generateId("STU");
  const studentCode = generateStudentCode(institute.code);
  const temporaryPassword = generateTemporaryPassword(10);
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const opCreatedAt = new Date().toISOString();

  await opRef.set({
    id: opDocId,
    idempotencyKey,
    instituteId: institute.id,
    actorUid: actor.uid,
    studentId,
    studentCode,
    authUid: null,
    email: normalizedEmail,
    admissionFeePaise,
    status: "pending",
    failureReason: null,
    createdAt: opCreatedAt,
    updatedAt: opCreatedAt,
  });

  let createdUid: string | null = null;

  try {
    const authUser = await auth
      .createUser({
        email: normalizedEmail,
        password: temporaryPassword,
        displayName: input.fullName,
        disabled: false,
      })
      .catch((err: unknown) => {
        const code = (err as { code?: string } | null)?.code;
        if (code === "auth/email-already-exists") {
          throw new AuthError(
            409,
            "EMAIL_ALREADY_EXISTS",
            `The email "${normalizedEmail}" is already registered to another account. Please use a unique student email.`
          );
        }
        if (code === "auth/invalid-email") {
          throw new AuthError(
            400,
            "INVALID_EMAIL",
            "Please enter a valid student email."
          );
        }
        throw err;
      });
    createdUid = authUser.uid;

    await opRef.update({
      authUid: createdUid,
      status: "auth_created",
      updatedAt: new Date().toISOString(),
    });

    await auth.setCustomUserClaims(createdUid, {
      role: "student",
      instituteId: institute.id,
      studentId,
      permissions: [],
      mustChangePassword: true,
    });

    const now = new Date().toISOString();
    const studentRecord: StudentRecord = {
      id: studentId,
      studentCode,
      instituteId: institute.id,
      uid: createdUid,
      fullName: input.fullName,
      email: normalizedEmail,
      phone: input.phone,
      guardianName: input.guardianName ?? "",
      guardianPhone: input.guardianPhone ?? "",
      address: input.address ?? "",
      admissionDate: input.admissionDate || now.slice(0, 10),
      courseId: input.courseId ?? null,
      batchId: input.batchId ?? null,
      courseName: input.courseName,
      batchName: input.batchName,
      status: "active",
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    };

    const debitTx = await db.runTransaction(async (tx) => {
      const instRef = institutesCollection().doc(institute.id);
      const instSnap = await tx.get(instRef);
      const latestInstitute = instSnap.data();
      if (!instSnap.exists || !latestInstitute || latestInstitute.status !== "active") {
        throw new AuthError(423, "INSTITUTE_SUSPENDED", "Institute is not active.");
      }

      if (input.courseId && input.batchId) {
        const courseRef = db.collection("courses").doc(input.courseId);
        const batchRef = db.collection("batches").doc(input.batchId);
        const [courseSnap, batchSnap] = await Promise.all([
          tx.get(courseRef),
          tx.get(batchRef),
        ]);
        const { batch } = validateCourseAndBatchRelationship({
          instituteId: institute.id,
          course: courseSnap.data() as CourseRecord | undefined,
          batch: batchSnap.data() as BatchRecord | undefined,
        });
        tx.update(batchRef, {
          enrolledCount: (batch.enrolledCount ?? 0) + 1,
          updatedAt: now,
        });
      }

      const txRecord = applyWalletDebitInTransaction(tx, latestInstitute, {
        instituteId: institute.id,
        amountPaise: latestInstitute.pricing.admissionFeePaise,
        reason: "student_admission",
        ledgerType: "admission_debit",
        referenceId: studentId,
        idempotencyKey: opDocId,
        actorUid: actor.uid,
        note: `Admission fee for ${input.fullName} (${studentCode})`,
      });

      tx.set(studentsCollection().doc(studentId), studentRecord);

      tx.set(usersCollection().doc(createdUid!), {
        uid: createdUid!,
        email: normalizedEmail,
        displayName: input.fullName,
        role: "student",
        instituteId: institute.id,
        studentId,
        permissions: [],
        disabled: false,
        mustChangePassword: true,
        createdAt: now,
        updatedAt: now,
      });

      tx.set(loginMappingsCollection().doc(`student_${studentCode}`), {
        identifier: studentCode,
        portal: "student",
        uid: createdUid!,
        authEmail: normalizedEmail,
        instituteId: institute.id,
        active: true,
        createdAt: now,
        updatedAt: now,
      });

      tx.update(opRef, {
        status: "completed",
        updatedAt: now,
      });

      return txRecord;
    });

    await recordAuditLog({
      action: "STUDENT_ADMITTED",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId: institute.id,
      targetId: studentId,
      metadata: {
        studentCode,
        admissionFeePaise,
        balanceAfterPaise: debitTx.balanceAfterPaise,
      },
    });

    return {
      student: studentRecord,
      credentials: {
        studentCode,
        loginEmail: normalizedEmail,
        temporaryPassword,
      },
      walletBalancePaise: debitTx.balanceAfterPaise,
    };
  } catch (error) {
    let reconciled = false;
    if (createdUid) {
      await auth
        .deleteUser(createdUid)
        .then(() => {
          reconciled = true;
        })
        .catch(() => undefined);
    }
    const reason = error instanceof Error ? error.message : "Admission failed";
    await opRef
      .update({
        status: reconciled ? "reconciled" : "failed",
        failureReason: reason,
        updatedAt: new Date().toISOString(),
      })
      .catch(() => undefined);

    await recordAuditLog({
      action: "STUDENT_ADMISSION_FAILED",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId: institute.id,
      targetId: studentId,
      metadata: { reason, reconciled },
    }).catch(() => undefined);

    throw error;
  }
}

export async function updateStudentProfile(
  actor: SessionUser,
  studentId: string,
  input: UpdateStudentInput
): Promise<StudentRecord> {
  if (!hasStaffPermission(actor, "students:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:write permission.");
  }

  const institute = await resolveAuthorizedInstitute(actor);
  const db = getAdminFirestore();
  const studentRef = studentsCollection().doc(studentId);
  const instRef = institutesCollection().doc(institute.id);

  let chargedPaise = 0;
  let chargeableChanges: Array<{
    field: string;
    before: string | null;
    after: string | null;
  }> = [];

  const updated = await db.runTransaction(async (tx) => {
    const [studentSnap, instSnap] = await Promise.all([
      tx.get(studentRef),
      tx.get(instRef),
    ]);
    const existing = studentSnap.data();
    const latestInst = instSnap.data();

    if (!studentSnap.exists || !existing || existing.instituteId !== institute.id) {
      throw new AuthError(404, "STUDENT_NOT_FOUND", "Student not found.");
    }
    if (!instSnap.exists || !latestInst || latestInst.status !== "active") {
      throw new AuthError(423, "INSTITUTE_SUSPENDED", "Institute is not active.");
    }

    chargeableChanges = detectChargeableProfileChanges(existing, input);
    const feePaise = latestInst.pricing.profileUpdateFeePaise;

    if (chargeableChanges.length > 0 && feePaise > 0) {
      if (input.confirmCharge === false) {
        throw new AuthError(
          409,
          "CHARGE_CONFIRMATION_REQUIRED",
          `Updating ${chargeableChanges.map((c) => c.field).join(", ")} incurs a ₹${(feePaise / 100).toFixed(2)} fee.`
        );
      }
      chargedPaise = feePaise;
      applyWalletDebitInTransaction(tx, latestInst, {
        instituteId: institute.id,
        amountPaise: feePaise,
        reason: "student_profile_update",
        ledgerType: "profile_edit_debit",
        referenceId: studentId,
        actorUid: actor.uid,
        note: `Profile update fee (${chargeableChanges.map((c) => c.field).join(", ")}) for ${existing.studentCode}`,
        metadata: {
          changedFields: chargeableChanges.map((c) => c.field).join(","),
        },
      });
    }

    const nextRecord: StudentRecord = {
      ...existing,
      fullName: input.fullName,
      phone: input.phone,
      guardianName: input.guardianName ?? existing.guardianName ?? "",
      guardianPhone: input.guardianPhone ?? existing.guardianPhone ?? "",
      address: input.address ?? existing.address ?? "",
      courseId: input.courseId ?? existing.courseId ?? null,
      batchId: input.batchId ?? existing.batchId ?? null,
      courseName: input.courseName,
      batchName: input.batchName,
      updatedAt: new Date().toISOString(),
    };
    tx.set(studentRef, nextRecord);
    return nextRecord;
  });

  await recordAuditLog({
    action: "STUDENT_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: studentId,
    metadata: {
      chargedPaise,
      changedFields: chargeableChanges.map((c) => c.field).join(",") || "non_chargeable",
    },
  });

  return updated;
}

export async function setStudentStatus(
  actor: SessionUser,
  studentId: string,
  nextStatus: "active" | "disabled"
): Promise<StudentRecord> {
  if (!hasStaffPermission(actor, "students:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:write permission.");
  }

  const student = await getInstituteStudentById(actor, studentId);
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const now = new Date().toISOString();

  await auth.updateUser(student.uid, { disabled: nextStatus === "disabled" });
  if (nextStatus === "disabled") {
    await auth.revokeRefreshTokens(student.uid);
  }

  const batch = db.batch();
  batch.update(studentsCollection().doc(studentId), {
    status: nextStatus,
    updatedAt: now,
  });
  batch.update(usersCollection().doc(student.uid), {
    disabled: nextStatus === "disabled",
    updatedAt: now,
  });
  batch.update(loginMappingsCollection().doc(`student_${student.studentCode}`), {
    active: nextStatus === "active",
    updatedAt: now,
  });
  await batch.commit();

  await recordAuditLog({
    action: "STUDENT_STATUS_CHANGED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: student.instituteId,
    targetId: studentId,
    metadata: { status: nextStatus },
  });

  return { ...student, status: nextStatus, updatedAt: now };
}

export async function resetStudentPassword(
  actor: SessionUser,
  studentId: string
): Promise<{ studentCode: string; temporaryPassword: string }> {
  if (!hasStaffPermission(actor, "students:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:write permission.");
  }

  const student = await getInstituteStudentById(actor, studentId);
  const temporaryPassword = generateTemporaryPassword(10);
  const auth = getAdminAuth();

  await auth.updateUser(student.uid, {
    password: temporaryPassword,
    disabled: false,
  });
  await auth.setCustomUserClaims(student.uid, {
    role: "student",
    instituteId: student.instituteId,
    studentId: student.id,
    permissions: [],
    mustChangePassword: true,
  });
  await auth.revokeRefreshTokens(student.uid);

  const now = new Date().toISOString();
  const db = getAdminFirestore();
  const batch = db.batch();
  batch.update(studentsCollection().doc(student.id), {
    mustChangePassword: true,
    updatedAt: now,
  });
  batch.update(usersCollection().doc(student.uid), {
    mustChangePassword: true,
    updatedAt: now,
  });
  await batch.commit();

  await recordAuditLog({
    action: "STUDENT_ACCESS_RESET",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: student.instituteId,
    targetId: student.id,
  });

  return {
    studentCode: student.studentCode,
    temporaryPassword,
  };
}

export async function deleteStudent(
  actor: SessionUser,
  studentId: string,
  reason = "Deleted by institute administrator"
): Promise<{ deleted: true; studentCode: string }> {
  if (!hasStaffPermission(actor, "students:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:write permission.");
  }

  const student = await getInstituteStudentById(actor, studentId);
  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const now = new Date().toISOString();

  if (student.uid) {
    await auth.updateUser(student.uid, { disabled: true }).catch(() => undefined);
    await auth.revokeRefreshTokens(student.uid).catch(() => undefined);
  }

  const batch = db.batch();
  batch.update(studentsCollection().doc(student.id), {
    status: "deleted",
    deletedAt: now,
    deletedBy: actor.uid,
    deletionReason: reason.trim() || "Deleted by administrator",
    updatedAt: now,
  });
  if (student.uid) {
    batch.update(usersCollection().doc(student.uid), {
      status: "disabled",
      updatedAt: now,
    });
  }
  await batch.commit();

  if (student.batchId && student.status !== "deleted") {
    const batchRef = db.collection("batches").doc(student.batchId);
    const batchSnap = await batchRef.get().catch(() => null);
    if (batchSnap?.exists) {
      const count = Number(batchSnap.data()?.enrolledCount ?? 0);
      if (count > 0) {
        await batchRef.update({ enrolledCount: count - 1 }).catch(() => undefined);
      }
    }
  }

  await recordAuditLog({
    action: "STUDENT_DELETED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: student.instituteId,
    targetId: student.id,
    metadata: {
      studentCode: student.studentCode,
      fullName: student.fullName,
      reason: reason.trim(),
    },
  });

  return { deleted: true, studentCode: student.studentCode };
}

export async function restoreStudent(
  actor: SessionUser,
  studentId: string
): Promise<StudentRecord> {
  if (!hasStaffPermission(actor, "students:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:write permission.");
  }

  const student = await getInstituteStudentById(actor, studentId);
  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const now = new Date().toISOString();

  if (student.uid) {
    await auth.updateUser(student.uid, { disabled: false }).catch(() => undefined);
  }

  const batch = db.batch();
  batch.update(studentsCollection().doc(student.id), {
    status: "active",
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    updatedAt: now,
  });
  if (student.uid) {
    batch.update(usersCollection().doc(student.uid), {
      status: "active",
      updatedAt: now,
    });
  }
  await batch.commit();

  await recordAuditLog({
    action: "STUDENT_RESTORED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: student.instituteId,
    targetId: student.id,
    metadata: { studentCode: student.studentCode, fullName: student.fullName },
  });

  return {
    ...student,
    status: "active",
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    updatedAt: now,
  };
}
