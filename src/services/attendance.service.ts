import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { studentsCollection } from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";
import type { AttendanceRecord, AttendanceStatus } from "@/types/academic";

function attendanceCol() {
  return getAdminFirestore().collection(
    "attendance_records"
  ) as CollectionReference<AttendanceRecord>;
}

export async function listAttendanceRecords(
  actor: SessionUser,
  filter?: {
    date?: string | undefined;
    batchId?: string | undefined;
    month?: string | undefined;
  }
): Promise<AttendanceRecord[]> {
  if (!hasStaffPermission(actor, "attendance:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing attendance:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await attendanceCol()
    .where("instituteId", "==", institute.id)
    .get();

  let items = snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 500);
  if (filter?.date) {
    items = items.filter((r) => r.date === filter.date);
  }
  if (filter?.batchId) {
    items = items.filter((r) => r.batchId === filter.batchId);
  }
  if (filter?.month) {
    items = items.filter((r) => r.date.startsWith(filter.month!));
  }
  return items;
}

export async function markBatchAttendance(
  actor: SessionUser,
  input: {
    batchId: string;
    batchName: string;
    date: string;
    entries: { studentId: string; status: AttendanceStatus }[];
  }
): Promise<{ savedCount: number; updatedCount: number }> {
  if (!hasStaffPermission(actor, "attendance:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing attendance:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const db = getAdminFirestore();
  const now = new Date().toISOString();

  let savedCount = 0;
  let updatedCount = 0;

  // Deterministic doc ID prevents duplicate attendance for same (institute, batch, student, date)
  for (const entry of input.entries) {
    const docId = `${institute.id}_${input.batchId}_${entry.studentId}_${input.date}`;
    const ref = attendanceCol().doc(docId);

    const [existingSnap, studentSnap] = await Promise.all([
      ref.get(),
      studentsCollection().doc(entry.studentId).get(),
    ]);
    const student = studentSnap.data();
    if (!studentSnap.exists || !student || student.instituteId !== institute.id) {
      throw new AuthError(404, "STUDENT_NOT_FOUND", "Student not found in institute.");
    }

    if (existingSnap.exists) {
      await ref.update({
        status: entry.status,
        editedByUid: actor.uid,
        updatedAt: now,
      });
      updatedCount++;
    } else {
      await ref.set({
        id: docId,
        instituteId: institute.id,
        batchId: input.batchId,
        batchName: input.batchName,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        date: input.date,
        status: entry.status,
        markedByUid: actor.uid,
        editedByUid: null,
        createdAt: now,
        updatedAt: now,
      });
      savedCount++;
    }
  }

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: input.batchId,
    metadata: {
      attendanceDate: input.date,
      savedCount,
      updatedCount,
    },
  });

  void db;
  return { savedCount, updatedCount };
}
