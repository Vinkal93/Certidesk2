import "server-only";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
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
import { applyWalletDebitInTransaction } from "./wallet.service";
import type { AdmitStudentInput, UpdateStudentInput } from "@/lib/validation/student";
import type { SessionUser } from "@/types/auth";
import type { StudentRecord } from "@/types/domain";

export async function listInstituteStudents(
  actor: SessionUser
): Promise<StudentRecord[]> {
  if (!hasStaffPermission(actor, "students:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await studentsCollection().where("instituteId", "==", institute.id).get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200);
}

export async function listInstituteStudentsPaginated(
  actor: SessionUser,
  filter: {
    search?: string | undefined;
    status?: "all" | "active" | "disabled" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
  } = {}
) {
  let items = await listInstituteStudents(actor);

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

export async function admitStudent(
  actor: SessionUser,
  input: AdmitStudentInput
): Promise<{
  student: StudentRecord;
  credentials: {
    studentCode: string;
    loginEmail: string;
    temporaryPassword: string;
  };
}> {
  if (!hasStaffPermission(actor, "students:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:write permission.");
  }

  const institute = await resolveAuthorizedInstitute(actor);
  const admissionFeePaise = institute.pricing.admissionFeePaise;

  if (institute.walletBalancePaise < admissionFeePaise) {
    throw new AuthError(
      402,
      "INSUFFICIENT_WALLET_BALANCE",
      `Insufficient wallet balance. Required ₹${(admissionFeePaise / 100).toFixed(2)}.`
    );
  }

  const normalizedEmail = input.email.toLowerCase();
  const studentId = generateId("STU");
  const studentCode = generateStudentCode(institute.code);
  const temporaryPassword = generateTemporaryPassword(10);
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  let createdUid: string | null = null;

  try {
    const authUser = await auth.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      displayName: input.fullName,
      disabled: false,
    });
    createdUid = authUser.uid;

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

    await db.runTransaction(async (tx) => {
      const instRef = institutesCollection().doc(institute.id);
      const instSnap = await tx.get(instRef);
      const latestInstitute = instSnap.data();
      if (!instSnap.exists || !latestInstitute || latestInstitute.status !== "active") {
        throw new AuthError(423, "INSTITUTE_SUSPENDED", "Institute is not active.");
      }

      applyWalletDebitInTransaction(tx, latestInstitute.walletBalancePaise, {
        instituteId: institute.id,
        amountPaise: latestInstitute.pricing.admissionFeePaise,
        reason: "student_admission",
        referenceId: studentId,
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
      },
    });

    return {
      student: studentRecord,
      credentials: {
        studentCode,
        loginEmail: normalizedEmail,
        temporaryPassword,
      },
    };
  } catch (error) {
    if (createdUid) {
      await auth.deleteUser(createdUid).catch(() => undefined);
    }
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

    const feePaise = latestInst.pricing.profileUpdateFeePaise;
    applyWalletDebitInTransaction(tx, latestInst.walletBalancePaise, {
      instituteId: institute.id,
      amountPaise: feePaise,
      reason: "student_profile_update",
      referenceId: studentId,
      actorUid: actor.uid,
      note: `Profile update fee for ${existing.studentCode}`,
    });

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
