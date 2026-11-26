import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { usersCollection } from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import type { CreateBatchInput, CreateCourseInput } from "@/lib/validation/academic";
import type { SessionUser } from "@/types/auth";
import type { BatchRecord, CourseRecord } from "@/types/academic";

function coursesCol() {
  return getAdminFirestore().collection("courses") as CollectionReference<CourseRecord>;
}

function batchesCol() {
  return getAdminFirestore().collection("batches") as CollectionReference<BatchRecord>;
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
  const now = new Date().toISOString();
  const record: BatchRecord = {
    id,
    instituteId: institute.id,
    name: input.name,
    courseId: course.id,
    courseName: course.name,
    timing: input.timing,
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
