import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { studentsCollection } from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";
import type {
  ExamMarkEntry,
  ExamSubject,
  ExaminationRecord,
  StudentMarksheetRecord,
} from "@/types/academic";

function examsCol() {
  return getAdminFirestore().collection(
    "examinations"
  ) as CollectionReference<ExaminationRecord>;
}

function marksheetsCol() {
  return getAdminFirestore().collection(
    "marksheets"
  ) as CollectionReference<StudentMarksheetRecord>;
}

export function computeGradeAndResult(
  percentage: number,
  allSubjectsPassed: boolean
): { grade: string; result: "PASS" | "FAIL" } {
  if (!allSubjectsPassed || percentage < 35) {
    return { grade: "F", result: "FAIL" };
  }
  if (percentage >= 90) return { grade: "A+", result: "PASS" };
  if (percentage >= 80) return { grade: "A", result: "PASS" };
  if (percentage >= 70) return { grade: "B+", result: "PASS" };
  if (percentage >= 60) return { grade: "B", result: "PASS" };
  if (percentage >= 50) return { grade: "C", result: "PASS" };
  return { grade: "D", result: "PASS" };
}

export async function listExaminations(actor: SessionUser) {
  if (!hasStaffPermission(actor, "exams:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const [examsSnap, marksheetsSnap] = await Promise.all([
    examsCol().where("instituteId", "==", institute.id).get(),
    marksheetsCol().where("instituteId", "==", institute.id).get(),
  ]);

  return {
    exams: examsSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    marksheets: marksheetsSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 200),
  };
}

export async function createExamination(
  actor: SessionUser,
  input: {
    title: string;
    batchId: string;
    batchName: string;
    examDate: string;
    subjects: ExamSubject[];
  }
): Promise<ExaminationRecord> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const id = generateId("EXM");
  const now = new Date().toISOString();

  const record: ExaminationRecord = {
    id,
    instituteId: institute.id,
    title: input.title,
    batchId: input.batchId,
    batchName: input.batchName,
    examDate: input.examDate,
    subjects: input.subjects,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };

  await examsCol().doc(id).set(record);
  return record;
}

export async function saveStudentExamMarks(
  actor: SessionUser,
  input: {
    examId: string;
    studentId: string;
    marks: { subjectId: string; obtainedMarks: number }[];
  }
): Promise<StudentMarksheetRecord> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);

  const [examSnap, studentSnap] = await Promise.all([
    examsCol().doc(input.examId).get(),
    studentsCollection().doc(input.studentId).get(),
  ]);
  const exam = examSnap.data();
  const student = studentSnap.data();

  if (!examSnap.exists || !exam || exam.instituteId !== institute.id) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }
  if (!studentSnap.exists || !student || student.instituteId !== institute.id) {
    throw new AuthError(404, "STUDENT_NOT_FOUND", "Student not found.");
  }

  let totalObtained = 0;
  let totalMax = 0;
  let allSubjectsPassed = true;

  const entries: ExamMarkEntry[] = exam.subjects.map((sub) => {
    const found = input.marks.find((m) => m.subjectId === sub.id);
    const obtained = Math.min(
      Math.max(0, Number(found?.obtainedMarks ?? 0)),
      sub.maxMarks
    );
    totalObtained += obtained;
    totalMax += sub.maxMarks;
    if (obtained < sub.passingMarks) {
      allSubjectsPassed = false;
    }
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      maxMarks: sub.maxMarks,
      obtainedMarks: obtained,
    };
  });

  const percentage =
    totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
  const { grade, result } = computeGradeAndResult(percentage, allSubjectsPassed);

  const docId = `${exam.id}_${student.id}`;
  const ref = marksheetsCol().doc(docId);
  const existing = await ref.get();
  const now = new Date().toISOString();

  const record: StudentMarksheetRecord = {
    id: docId,
    instituteId: institute.id,
    examId: exam.id,
    examTitle: exam.title,
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.fullName,
    batchName: exam.batchName,
    marks: entries,
    totalObtained,
    totalMax,
    percentage,
    grade,
    result,
    published: exam.status === "published",
    updatedByUid: actor.uid,
    createdAt: existing.data()?.createdAt ?? now,
    updatedAt: now,
  };

  await ref.set(record);

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: docId,
    metadata: { examId: exam.id, totalObtained, totalMax, grade, result },
  });

  return record;
}

export async function publishExamResults(
  actor: SessionUser,
  examId: string
): Promise<ExaminationRecord> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = examsCol().doc(examId);
  const snap = await ref.get();
  const exam = snap.data();

  if (!snap.exists || !exam || exam.instituteId !== institute.id) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }

  const now = new Date().toISOString();
  await ref.update({ status: "published", updatedAt: now });

  const msSnap = await marksheetsCol().where("examId", "==", examId).get();
  const batch = getAdminFirestore().batch();
  for (const doc of msSnap.docs) {
    batch.update(doc.ref, { published: true, updatedAt: now });
  }
  await batch.commit();

  return { ...exam, status: "published", updatedAt: now };
}
