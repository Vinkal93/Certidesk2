import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection, studentsCollection } from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { listStudentOwnCertificates } from "./certificate.service";
import type { SessionUser } from "@/types/auth";
import type {
  AttendanceRecord,
  BatchRecord,
  CourseRecord,
  ExaminationRecord,
  FeePaymentRecord,
  StudentFeePlanRecord,
  StudentMarksheetRecord,
} from "@/types/academic";
import type { CommunicationLogRecord } from "./institute-ops.service";

async function resolveVerifiedStudentContext(actor: SessionUser) {
  if (actor.role !== "student" || !actor.studentId || !actor.instituteId) {
    throw new AuthError(403, "FORBIDDEN", "Student authentication required.");
  }

  const [studentSnap, instSnap] = await Promise.all([
    studentsCollection().doc(actor.studentId).get(),
    institutesCollection().doc(actor.instituteId).get(),
  ]);

  const student = studentSnap.data();
  const institute = instSnap.data();

  if (!instSnap.exists || !institute) {
    throw new AuthError(403, "INSTITUTE_NOT_FOUND", "Institute not found.");
  }
  if (institute.status !== "active") {
    throw new AuthError(423, "INSTITUTE_SUSPENDED", "Institute is suspended.");
  }
  if (!studentSnap.exists || !student || student.instituteId !== actor.instituteId) {
    throw new AuthError(403, "STUDENT_NOT_FOUND", "Student record not found.");
  }
  if (student.status !== "active") {
    throw new AuthError(403, "STUDENT_DISABLED", "Student account is disabled.");
  }

  return { student, institute };
}

export async function getStudentPortalContext(actor: SessionUser) {
  const { student, institute } = await resolveVerifiedStudentContext(actor);
  const db = getAdminFirestore();

  const [commSnap, readsSnap] = await Promise.all([
    db
      .collection("communication_logs")
      .where("instituteId", "==", institute.id)
      .where("channel", "==", "in_app")
      .get(),
    db
      .collection("student_notification_reads")
      .where("studentId", "==", student.id)
      .get(),
  ]);

  const readIds = new Set(readsSnap.docs.map((d) => String(d.data().notificationId)));
  const unreadNotificationsCount = commSnap.docs.filter((d) => !readIds.has(d.id)).length;

  return { student, institute, unreadNotificationsCount };
}

export async function getStudentDashboardData(actor: SessionUser) {
  const { student, institute } = await resolveVerifiedStudentContext(actor);
  const db = getAdminFirestore();
  const today = new Date().toISOString().slice(0, 10);

  const [
    attendanceSnap,
    examsSnap,
    marksheetsSnap,
    certificates,
    feePlansSnap,
    notificationsData,
  ] = await Promise.all([
    db.collection("attendance_records").where("studentId", "==", student.id).get(),
    db.collection("examinations").where("instituteId", "==", institute.id).get(),
    db.collection("marksheets").where("studentId", "==", student.id).get(),
    listStudentOwnCertificates(student.id, institute.id),
    db.collection("student_fee_plans").where("studentId", "==", student.id).get(),
    getStudentNotifications(actor),
  ]);

  const attendance = attendanceSnap.docs
    .map((d) => d.data() as AttendanceRecord)
    .filter((a) => a.instituteId === institute.id);
  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendancePct =
    attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  const upcomingExams = examsSnap.docs
    .map((d) => d.data() as ExaminationRecord)
    .filter((e) => e.examDate >= today && e.status !== "completed")
    .sort((a, b) => a.examDate.localeCompare(b.examDate))
    .slice(0, 5);

  const publishedResults = marksheetsSnap.docs
    .map((d) => d.data() as StudentMarksheetRecord)
    .filter((m) => m.instituteId === institute.id && m.published)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const feePlans = feePlansSnap.docs
    .map((d) => d.data() as StudentFeePlanRecord)
    .filter((p) => p.instituteId === institute.id);
  const totalFeePaise = feePlans.reduce((s, p) => s + p.totalFeePaise, 0);
  const paidFeePaise = feePlans.reduce((s, p) => s + p.paidPaise, 0);
  const pendingFeePaise = feePlans.reduce((s, p) => s + p.pendingPaise, 0);

  return {
    student,
    institute,
    attendancePct,
    attendanceTotalDays: attendance.length,
    upcomingExams,
    publishedResults,
    certificateCount: certificates.filter((c) => c.status === "issued").length,
    feeSummary: { totalFeePaise, paidFeePaise, pendingFeePaise },
    recentNotifications: notificationsData.slice(0, 4),
  };
}

export async function getStudentCourseAndBatch(actor: SessionUser) {
  const { student, institute } = await resolveVerifiedStudentContext(actor);
  const db = getAdminFirestore();

  const [coursesSnap, batchesSnap] = await Promise.all([
    db.collection("courses").where("instituteId", "==", institute.id).get(),
    db.collection("batches").where("instituteId", "==", institute.id).get(),
  ]);

  const courses = coursesSnap.docs.map((d) => d.data() as CourseRecord);
  const batches = batchesSnap.docs.map((d) => d.data() as BatchRecord);

  const course =
    courses.find((c) => c.id === student.courseId || c.name === student.courseName) ??
    null;
  const batch =
    batches.find((b) => b.id === student.batchId || b.name === student.batchName) ?? null;

  return { student, institute, course, batch };
}

export async function getStudentAttendanceData(actor: SessionUser, month?: string) {
  const { student, institute } = await resolveVerifiedStudentContext(actor);
  const db = getAdminFirestore();
  const snap = await db
    .collection("attendance_records")
    .where("studentId", "==", student.id)
    .get();

  let records = snap.docs
    .map((d) => d.data() as AttendanceRecord)
    .filter((r) => r.instituteId === institute.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 200);

  if (month) {
    records = records.filter((r) => r.date.startsWith(month));
  }

  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const leave = records.filter((r) => r.status === "leave").length;
  const percentage =
    records.length > 0 ? Math.round((present / records.length) * 100) : 0;

  return {
    records,
    summary: { total: records.length, present, absent, leave, percentage },
  };
}

export async function getStudentExamsAndResults(actor: SessionUser) {
  const { student, institute } = await resolveVerifiedStudentContext(actor);
  const db = getAdminFirestore();

  const [examsSnap, marksheetsSnap] = await Promise.all([
    db.collection("examinations").where("instituteId", "==", institute.id).get(),
    db.collection("marksheets").where("studentId", "==", student.id).get(),
  ]);

  const exams = (examsSnap.docs.map((d) => d.data()) as ExaminationRecord[]).sort((a, b) =>
    b.examDate.localeCompare(a.examDate)
  );
  // Students can ONLY see results after publication
  const publishedMarksheets = marksheetsSnap.docs
    .map((d) => d.data() as StudentMarksheetRecord)
    .filter((m) => m.instituteId === institute.id && m.published)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { student, institute, exams, publishedMarksheets };
}

export async function getStudentFeesAndPayments(actor: SessionUser) {
  const { student, institute } = await resolveVerifiedStudentContext(actor);
  const db = getAdminFirestore();

  const [plansSnap, paymentsSnap] = await Promise.all([
    db.collection("student_fee_plans").where("studentId", "==", student.id).get(),
    db.collection("fee_payments").where("studentId", "==", student.id).get(),
  ]);

  const plans = plansSnap.docs
    .map((d) => d.data() as StudentFeePlanRecord)
    .filter((p) => p.instituteId === institute.id);
  const payments = paymentsSnap.docs
    .map((d) => d.data() as FeePaymentRecord)
    .filter((p) => p.instituteId === institute.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { plans, payments };
}

export async function getStudentNotifications(actor: SessionUser) {
  const { student, institute } = await resolveVerifiedStudentContext(actor);
  const db = getAdminFirestore();

  const [commSnap, readsSnap] = await Promise.all([
    db.collection("communication_logs").where("instituteId", "==", institute.id).get(),
    db
      .collection("student_notification_reads")
      .where("studentId", "==", student.id)
      .get(),
  ]);

  const readIds = new Set(readsSnap.docs.map((d) => String(d.data().notificationId)));

  return commSnap.docs
    .map((d) => d.data() as CommunicationLogRecord)
    .filter((data) => data.channel === "in_app")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)
    .map((data) => ({
      ...data,
      read: readIds.has(data.id),
    }));
}

export async function markStudentNotificationRead(
  actor: SessionUser,
  notificationId: string
): Promise<void> {
  const { student, institute } = await resolveVerifiedStudentContext(actor);
  const db = getAdminFirestore();
  const docId = `${student.id}_${notificationId}`;
  await db.collection("student_notification_reads").doc(docId).set({
    id: docId,
    studentId: student.id,
    instituteId: institute.id,
    notificationId,
    readAt: new Date().toISOString(),
  });
}
