import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { studentsCollection, usersCollection } from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { CreateBatchInput, CreateCourseInput } from "@/lib/validation/academic";
import type { SessionUser } from "@/types/auth";
import type {
  BatchRecord,
  CourseRecord,
  StudentBatchTransferRecord,
} from "@/types/academic";

function coursesCol() {
  return getAdminFirestore().collection("courses") as CollectionReference<CourseRecord>;
}

function batchesCol() {
  return getAdminFirestore().collection("batches") as CollectionReference<BatchRecord>;
}

function transfersCol() {
  return getAdminFirestore().collection(
    "studentBatchTransfers"
  ) as CollectionReference<StudentBatchTransferRecord>;
}

/**
 * Pure validation helper for Course -> Batch admission & transfer integrity.
 * Exported for unit testing.
 */
export function validateCourseAndBatchRelationship(params: {
  instituteId: string;
  course: CourseRecord | undefined;
  batch: BatchRecord | undefined;
}): { course: CourseRecord; batch: BatchRecord } {
  const { instituteId, course, batch } = params;
  if (!course || course.instituteId !== instituteId) {
    throw new AuthError(404, "COURSE_NOT_FOUND", "Selected course not found.");
  }
  if (course.status !== "active") {
    throw new AuthError(400, "COURSE_INACTIVE", "Selected course is not active.");
  }
  if (!batch || batch.instituteId !== instituteId) {
    throw new AuthError(404, "BATCH_NOT_FOUND", "Selected batch not found.");
  }
  if (batch.courseId !== course.id) {
    throw new AuthError(
      400,
      "COURSE_BATCH_MISMATCH",
      "Selected batch does not belong to the selected course."
    );
  }
  if (batch.status !== "active") {
    throw new AuthError(400, "BATCH_INACTIVE", "Selected batch is not active.");
  }
  if (batch.enrolledCount >= batch.capacity) {
    throw new AuthError(
      409,
      "BATCH_CAPACITY_REACHED",
      `Batch ${batch.name} has reached its capacity (${batch.capacity}).`
    );
  }
  return { course, batch };
}

export async function listCourses(
  actor: SessionUser,
  includeDeleted = false
): Promise<CourseRecord[]> {
  if (!hasStaffPermission(actor, "courses:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const [snap, studentsSnap] = await Promise.all([
    coursesCol().where("instituteId", "==", institute.id).get(),
    studentsCollection().where("instituteId", "==", institute.id).get(),
  ]);

  const countByCourse = new Map<string, number>();
  for (const doc of studentsSnap.docs) {
    const st = doc.data();
    if (st.status !== "deleted" && st.courseId) {
      countByCourse.set(st.courseId, (countByCourse.get(st.courseId) ?? 0) + 1);
    }
  }

  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        ...data,
        enrolledCount: countByCourse.get(data.id) ?? 0,
      };
    })
    .filter((c) => includeDeleted || c.status !== "deleted")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function computeCourseFeeFields(input: CreateCourseInput) {
  const admissionFeePaise = Math.round((input.admissionFeeRupees ?? 0) * 100);
  if (
    typeof input.monthlyFeeRupees === "number" &&
    typeof input.durationMonths === "number" &&
    input.durationMonths > 0
  ) {
    const monthlyFeePaise = Math.round(input.monthlyFeeRupees * 100);
    const feePaise = monthlyFeePaise * input.durationMonths + admissionFeePaise;
    return {
      durationMonths: input.durationMonths,
      monthlyFeePaise,
      admissionFeePaise,
      feePaise,
    };
  }
  return {
    ...(typeof input.durationMonths === "number"
      ? { durationMonths: input.durationMonths }
      : {}),
    ...(typeof input.monthlyFeeRupees === "number"
      ? { monthlyFeePaise: Math.round(input.monthlyFeeRupees * 100) }
      : {}),
    ...(admissionFeePaise > 0 ? { admissionFeePaise } : {}),
    feePaise: Math.round(input.feeRupees * 100),
  };
}

export async function createCourse(
  actor: SessionUser,
  input: CreateCourseInput
): Promise<CourseRecord> {
  if (!hasStaffPermission(actor, "courses:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const normalizedCode = input.code.trim().toUpperCase();
  const existingSnap = await coursesCol()
    .where("instituteId", "==", institute.id)
    .where("code", "==", normalizedCode)
    .get();
  const hasDuplicate = existingSnap.docs.some((d) => d.data().status !== "deleted");
  if (hasDuplicate) {
    throw new AuthError(
      409,
      "DUPLICATE_COURSE_CODE",
      `Course code "${normalizedCode}" already exists in your institute. Edit the existing course instead.`
    );
  }

  const id = generateId("CRS");
  const now = new Date().toISOString();
  const feeFields = computeCourseFeeFields(input);

  const record: CourseRecord = {
    id,
    instituteId: institute.id,
    name: input.name,
    code: normalizedCode,
    duration: input.duration,
    ...feeFields,
    description: input.description,
    subjects: input.subjects.sort((a, b) => a.order - b.order),
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };

  await coursesCol().doc(id).set(record);
  await recordAuditLog({
    action: "COURSE_CREATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: id,
    metadata: { code: normalizedCode, name: input.name },
  });
  return { ...record, enrolledCount: 0 };
}

export async function updateCourse(
  actor: SessionUser,
  courseId: string,
  input: CreateCourseInput
): Promise<CourseRecord> {
  if (!hasStaffPermission(actor, "courses:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = coursesCol().doc(courseId);
  const snap = await ref.get();
  const existing = snap.data();

  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const normalizedCode = input.code.trim().toUpperCase();
  if (normalizedCode !== existing.code) {
    const dupSnap = await coursesCol()
      .where("instituteId", "==", institute.id)
      .where("code", "==", normalizedCode)
      .get();
    if (dupSnap.docs.some((d) => d.id !== courseId && d.data().status !== "deleted")) {
      throw new AuthError(
        409,
        "DUPLICATE_COURSE_CODE",
        `Course code "${normalizedCode}" is already used by another course.`
      );
    }
  }

  const feeFields = computeCourseFeeFields(input);

  const updated: CourseRecord = {
    ...existing,
    name: input.name,
    code: normalizedCode,
    duration: input.duration,
    ...feeFields,
    description: input.description,
    subjects: input.subjects.sort((a, b) => a.order - b.order),
    status: input.status,
    updatedAt: new Date().toISOString(),
  };

  await ref.set(updated);
  await recordAuditLog({
    action: "COURSE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: courseId,
    metadata: { code: normalizedCode, name: input.name },
  });
  return updated;
}

export async function deleteCourse(
  actor: SessionUser,
  courseId: string,
  reason: string,
  force = false
): Promise<{
  deleted: boolean;
  courseId: string;
  dependencies: { students: number; batches: number };
}> {
  if (!hasStaffPermission(actor, "courses:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = coursesCol().doc(courseId);
  const snap = await ref.get();
  const existing = snap.data();

  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const [studentsSnap, batchesSnap] = await Promise.all([
    studentsCollection()
      .where("instituteId", "==", institute.id)
      .where("courseId", "==", courseId)
      .get(),
    batchesCol()
      .where("instituteId", "==", institute.id)
      .where("courseId", "==", courseId)
      .get(),
  ]);

  const activeStudents = studentsSnap.docs.filter(
    (d) => d.data().status !== "deleted"
  ).length;
  const activeBatches = batchesSnap.docs.filter(
    (d) => d.data().status !== "archived"
  ).length;

  if ((activeStudents > 0 || activeBatches > 0) && !force) {
    throw new AuthError(
      409,
      "DEPENDENCY_CONFLICT",
      `Cannot delete "${existing.name}": ${activeStudents} enrolled student(s) and ${activeBatches} active batch(es) depend on this course. Resolve dependencies or confirm forced soft-delete.`
    );
  }

  const now = new Date().toISOString();
  await ref.update({
    status: "deleted",
    deletedAt: now,
    deletedBy: actor.uid,
    deletionReason: reason.trim() || "Soft deleted by administrator",
    updatedAt: now,
  });

  await recordAuditLog({
    action: "COURSE_DELETED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: courseId,
    metadata: {
      code: existing.code,
      name: existing.name,
      reason: reason.trim(),
      force,
      activeStudents,
      activeBatches,
    },
  });

  return {
    deleted: true,
    courseId,
    dependencies: { students: activeStudents, batches: activeBatches },
  };
}

export async function restoreCourse(
  actor: SessionUser,
  courseId: string
): Promise<CourseRecord> {
  if (!hasStaffPermission(actor, "courses:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = coursesCol().doc(courseId);
  const snap = await ref.get();
  const existing = snap.data();

  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const now = new Date().toISOString();
  const restored: CourseRecord = {
    ...existing,
    status: "active",
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    updatedAt: now,
  };
  await ref.set(restored);

  await recordAuditLog({
    action: "COURSE_RESTORED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: courseId,
    metadata: { code: existing.code, name: existing.name },
  });

  return restored;
}

export async function listBatches(actor: SessionUser): Promise<BatchRecord[]> {
  if (!hasStaffPermission(actor, "batches:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing batches:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await batchesCol().where("instituteId", "==", institute.id).get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createBatch(
  actor: SessionUser,
  input: CreateBatchInput
): Promise<BatchRecord> {
  if (!hasStaffPermission(actor, "batches:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing batches:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);

  const courseSnap = await coursesCol().doc(input.courseId).get();
  const course = courseSnap.data();
  if (!courseSnap.exists || !course || course.instituteId !== institute.id) {
    throw new AuthError(404, "COURSE_NOT_FOUND", "Selected course not found.");
  }

  let teacherName: string | null = null;
  if (input.teacherUid) {
    const teacherSnap = await usersCollection().doc(input.teacherUid).get();
    const teacher = teacherSnap.data();
    if (!teacher || teacher.instituteId !== institute.id) {
      throw new AuthError(404, "TEACHER_NOT_FOUND", "Assigned teacher not found.");
    }
    teacherName = teacher.displayName;
  }

  const id = generateId("BAT");
  const batchCode = input.code?.trim().toUpperCase() || id;

  if (input.status === "active" && input.code?.trim()) {
    const dupSnap = await batchesCol()
      .where("instituteId", "==", institute.id)
      .where("code", "==", batchCode)
      .where("status", "==", "active")
      .limit(1)
      .get();
    if (!dupSnap.empty) {
      throw new AuthError(
        409,
        "DUPLICATE_BATCH_CODE",
        `Active batch with code ${batchCode} already exists.`
      );
    }
  }

  const now = new Date().toISOString();
  const record: BatchRecord = {
    id,
    instituteId: institute.id,
    name: input.name,
    code: batchCode,
    courseId: course.id,
    courseName: course.name,
    timing: input.timing,
    ...(input.startDate ? { startDate: input.startDate } : {}),
    ...(input.expectedEndDate ? { expectedEndDate: input.expectedEndDate } : {}),
    ...(input.room !== undefined ? { room: input.room } : {}),
    ...(input.description ? { description: input.description } : {}),
    teacherUid: input.teacherUid ?? null,
    teacherName,
    capacity: input.capacity,
    enrolledCount: 0,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };

  await batchesCol().doc(id).set(record);
  return record;
}

export async function getCourseById(
  actor: SessionUser,
  courseId: string
): Promise<CourseRecord> {
  if (!hasStaffPermission(actor, "courses:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await coursesCol().doc(courseId).get();
  const course = snap.data();
  if (!snap.exists || !course || course.instituteId !== institute.id) {
    throw new AuthError(404, "COURSE_NOT_FOUND", "Course not found.");
  }
  return course;
}

export async function getBatchById(
  actor: SessionUser,
  batchId: string
): Promise<BatchRecord> {
  if (!hasStaffPermission(actor, "batches:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing batches:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await batchesCol().doc(batchId).get();
  const batch = snap.data();
  if (!snap.exists || !batch || batch.instituteId !== institute.id) {
    throw new AuthError(404, "BATCH_NOT_FOUND", "Batch not found.");
  }
  return batch;
}

export async function transferStudentBatch(
  actor: SessionUser,
  input: {
    studentId: string;
    newCourseId: string;
    newBatchId: string;
    effectiveDate: string;
    reason: string;
  }
): Promise<StudentBatchTransferRecord> {
  if (!hasStaffPermission(actor, "students:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing students:write permission.");
  }
  if (!input.reason || input.reason.trim().length < 4) {
    throw new AuthError(400, "REASON_REQUIRED", "Transfer reason is required.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const db = getAdminFirestore();

  const transfer = await db.runTransaction(async (tx) => {
    const stuRef = studentsCollection().doc(input.studentId);
    const courseRef = coursesCol().doc(input.newCourseId);
    const batchRef = batchesCol().doc(input.newBatchId);

    const [stuSnap, courseSnap, batchSnap] = await Promise.all([
      tx.get(stuRef),
      tx.get(courseRef),
      tx.get(batchRef),
    ]);
    const student = stuSnap.data();
    if (!stuSnap.exists || !student || student.instituteId !== institute.id) {
      throw new AuthError(404, "STUDENT_NOT_FOUND", "Student not found.");
    }

    const { course, batch } = validateCourseAndBatchRelationship({
      instituteId: institute.id,
      course: courseSnap.data(),
      batch: batchSnap.data(),
    });

    const now = new Date().toISOString();
    const id = generateId("TRF");
    const record: StudentBatchTransferRecord = {
      id,
      instituteId: institute.id,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.fullName,
      oldCourseId: student.courseId ?? null,
      oldCourseName: student.courseName,
      oldBatchId: student.batchId ?? null,
      oldBatchName: student.batchName,
      newCourseId: course.id,
      newCourseName: course.name,
      newBatchId: batch.id,
      newBatchName: batch.name,
      effectiveDate: input.effectiveDate || now.slice(0, 10),
      reason: input.reason.trim(),
      actorUid: actor.uid,
      createdAt: now,
    };

    if (student.batchId && student.batchId !== batch.id) {
      const oldBatchRef = batchesCol().doc(student.batchId);
      const oldBatchSnap = await tx.get(oldBatchRef);
      const oldBatch = oldBatchSnap.data();
      if (oldBatch && oldBatch.instituteId === institute.id) {
        tx.update(oldBatchRef, {
          enrolledCount: Math.max(0, oldBatch.enrolledCount - 1),
          updatedAt: now,
        });
      }
    }

    if (student.batchId !== batch.id) {
      tx.update(batchRef, {
        enrolledCount: batch.enrolledCount + 1,
        updatedAt: now,
      });
    }

    tx.update(stuRef, {
      courseId: course.id,
      courseName: course.name,
      batchId: batch.id,
      batchName: batch.name,
      updatedAt: now,
    });
    tx.set(transfersCol().doc(id), record);

    return record;
  });

  await recordAuditLog({
    action: "STUDENT_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: input.studentId,
    metadata: {
      transferId: transfer.id,
      newCourseId: transfer.newCourseId,
      newBatchId: transfer.newBatchId,
      reason: transfer.reason,
    },
  });

  return transfer;
}
