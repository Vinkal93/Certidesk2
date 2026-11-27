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

export async function listCourses(actor: SessionUser): Promise<CourseRecord[]> {
  if (!hasStaffPermission(actor, "courses:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await coursesCol().where("instituteId", "==", institute.id).get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createCourse(
  actor: SessionUser,
  input: CreateCourseInput
): Promise<CourseRecord> {
  if (!hasStaffPermission(actor, "courses:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const id = generateId("CRS");
  const now = new Date().toISOString();

  const record: CourseRecord = {
    id,
    instituteId: institute.id,
    name: input.name,
    code: input.code.toUpperCase(),
    duration: input.duration,
    feePaise: Math.round(input.feeRupees * 100),
    description: input.description,
    subjects: input.subjects.sort((a, b) => a.order - b.order),
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };

  await coursesCol().doc(id).set(record);
  return record;
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

  const updated: CourseRecord = {
    ...existing,
    name: input.name,
    code: input.code.toUpperCase(),
    duration: input.duration,
    feePaise: Math.round(input.feeRupees * 100),
    description: input.description,
    subjects: input.subjects.sort((a, b) => a.order - b.order),
    status: input.status,
    updatedAt: new Date().toISOString(),
  };

  await ref.set(updated);
  return updated;
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
