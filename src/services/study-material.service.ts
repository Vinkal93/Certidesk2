import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";

export type StudyMaterialType = "document" | "link" | "channel" | "video";

export interface StudyMaterialRecord {
  id: string;
  instituteId: string;
  title: string;
  description: string;
  materialType: StudyMaterialType;
  url: string;
  courseName: string;
  status: "active" | "deleted";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function studyMaterialsCol() {
  return getAdminFirestore().collection(
    "study_materials"
  ) as CollectionReference<StudyMaterialRecord>;
}

export async function listInstituteStudyMaterials(
  actor: SessionUser
): Promise<StudyMaterialRecord[]> {
  if (!hasStaffPermission(actor, "courses:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await studyMaterialsCol().where("instituteId", "==", institute.id).get();
  return snap.docs
    .map((d) => d.data())
    .filter((m) => m.status !== "deleted")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listStudentStudyMaterials(
  actor: SessionUser
): Promise<StudyMaterialRecord[]> {
  if (actor.role !== "student" || !actor.instituteId) {
    throw new AuthError(403, "FORBIDDEN", "Student session required.");
  }
  const snap = await studyMaterialsCol()
    .where("instituteId", "==", actor.instituteId)
    .get();
  return snap.docs
    .map((d) => d.data())
    .filter((m) => m.status === "active")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createStudyMaterial(
  actor: SessionUser,
  input: {
    title: string;
    description: string;
    materialType: StudyMaterialType;
    url: string;
    courseName: string;
  }
): Promise<StudyMaterialRecord> {
  if (!hasStaffPermission(actor, "courses:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const id = generateId("MAT");
  const now = new Date().toISOString();

  const record: StudyMaterialRecord = {
    id,
    instituteId: institute.id,
    title: input.title.trim(),
    description: input.description.trim(),
    materialType: input.materialType,
    url: input.url.trim(),
    courseName: input.courseName.trim() || "All Courses",
    status: "active",
    createdBy: actor.uid,
    createdAt: now,
    updatedAt: now,
  };

  await studyMaterialsCol().doc(id).set(record);
  await recordAuditLog({
    action: "COURSE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: id,
    metadata: { studyMaterialTitle: record.title, type: record.materialType },
  });
  return record;
}

export async function updateStudyMaterial(
  actor: SessionUser,
  materialId: string,
  input: {
    title: string;
    description: string;
    materialType: StudyMaterialType;
    url: string;
    courseName: string;
  }
): Promise<StudyMaterialRecord> {
  if (!hasStaffPermission(actor, "courses:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = studyMaterialsCol().doc(materialId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "NOT_FOUND", "Study material not found.");
  }

  const updated: StudyMaterialRecord = {
    ...existing,
    title: input.title.trim(),
    description: input.description.trim(),
    materialType: input.materialType,
    url: input.url.trim(),
    courseName: input.courseName.trim() || "All Courses",
    updatedAt: new Date().toISOString(),
  };
  await ref.set(updated);
  return updated;
}

export async function deleteStudyMaterial(actor: SessionUser, materialId: string) {
  if (!hasStaffPermission(actor, "courses:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing courses:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = studyMaterialsCol().doc(materialId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "NOT_FOUND", "Study material not found.");
  }
  await ref.update({
    status: "deleted",
    updatedAt: new Date().toISOString(),
  });
  return { deleted: true, id: materialId };
}
