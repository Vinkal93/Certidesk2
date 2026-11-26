import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";

export type DashboardDateRange = "7d" | "30d" | "90d" | "all";

function getCutoffIso(range: DashboardDateRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const dt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return dt.toISOString();
}

export async function getInstituteDashboardData(
  instituteId: string,
  range: DashboardDateRange = "30d"
) {
  const db = getAdminFirestore();
  const cutoff = getCutoffIso(range);
  const today = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = today.slice(0, 7);

  const [
    studentsSnap,
    coursesSnap,
    batchesSnap,
    staffSnap,
    attendanceSnap,
    feePaymentsSnap,
    feePlansSnap,
    examsSnap,
    certificatesSnap,
  ] = await Promise.all([
    db.collection("students").where("instituteId", "==", instituteId).get(),
    db.collection("courses").where("instituteId", "==", instituteId).get(),
    db.collection("batches").where("instituteId", "==", instituteId).get(),
    db
      .collection("users")
      .where("instituteId", "==", instituteId)
      .where("role", "==", "staff")
      .get(),
    db
      .collection("attendance_records")
      .where("instituteId", "==", instituteId)
      .where("date", "==", today)
      .get(),
    db.collection("fee_payments").where("instituteId", "==", instituteId).get(),
    db.collection("student_fee_plans").where("instituteId", "==", instituteId).get(),
    db.collection("examinations").where("instituteId", "==", instituteId).get(),
    db.collection("certificates").where("instituteId", "==", instituteId).get(),
  ]);

  const students = studentsSnap.docs.map((d) => d.data() as Record<string, unknown>);
  const courses = coursesSnap.docs.map((d) => d.data() as Record<string, unknown>);
  const batches = batchesSnap.docs.map((d) => d.data() as Record<string, unknown>);
  const todayAttendance = attendanceSnap.docs.map(
    (d) => d.data() as Record<string, unknown>
  );
  const feePayments = feePaymentsSnap.docs.map(
    (d) => d.data() as Record<string, unknown>
  );
  const feePlans = feePlansSnap.docs.map((d) => d.data() as Record<string, unknown>);
  const exams = examsSnap.docs.map((d) => d.data() as Record<string, unknown>);
  const certificates = certificatesSnap.docs.map(
    (d) => d.data() as Record<string, unknown>
  );

  const newAdmissions = students.filter((s) =>
    cutoff ? String(s.createdAt ?? "") >= cutoff : true
  );

  const monthlyCollectionPaise = feePayments
    .filter((p) => String(p.paidAt ?? p.createdAt ?? "").startsWith(currentMonthPrefix))
    .reduce((sum, p) => sum + Number(p.amountPaise ?? 0), 0);

  const pendingFeesPaise = feePlans.reduce(
    (sum, plan) => sum + Math.max(0, Number(plan.pendingPaise ?? 0)),
    0
  );

  const presentToday = todayAttendance.filter((a) => a.status === "present").length;
  const absentToday = todayAttendance.filter((a) => a.status === "absent").length;
  const leaveToday = todayAttendance.filter((a) => a.status === "leave").length;

  const recentAdmissions = [...students]
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
    .slice(0, 5)
    .map((s) => ({
      id: String(s.id ?? ""),
      studentCode: String(s.studentCode ?? ""),
      fullName: String(s.fullName ?? ""),
      courseName: String(s.courseName ?? ""),
      status: String(s.status ?? "active"),
      createdAt: String(s.createdAt ?? ""),
    }));

  const recentFeeTransactions = [...feePayments]
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
    .slice(0, 5)
    .map((p) => ({
      id: String(p.id ?? ""),
      studentName: String(p.studentName ?? ""),
      receiptNo: String(p.receiptNo ?? ""),
      amountPaise: Number(p.amountPaise ?? 0),
      paymentMode: String(p.paymentMode ?? "cash"),
      createdAt: String(p.createdAt ?? ""),
    }));

  const pendingDuesList = feePlans
    .filter((p) => Number(p.pendingPaise ?? 0) > 0)
    .sort((a, b) => Number(b.pendingPaise ?? 0) - Number(a.pendingPaise ?? 0))
    .slice(0, 5)
    .map((p) => ({
      id: String(p.id ?? ""),
      studentName: String(p.studentName ?? ""),
      courseName: String(p.courseName ?? ""),
      pendingPaise: Number(p.pendingPaise ?? 0),
    }));

  const upcomingExams = exams
    .filter((e) => String(e.examDate ?? "") >= today && e.status !== "completed")
    .sort((a, b) => String(a.examDate ?? "").localeCompare(String(b.examDate ?? "")))
    .slice(0, 5)
    .map((e) => ({
      id: String(e.id ?? ""),
      title: String(e.title ?? ""),
      batchName: String(e.batchName ?? ""),
      examDate: String(e.examDate ?? ""),
    }));

  const recentCertificates = [...certificates]
    .sort((a, b) => String(b.issuedAt ?? "").localeCompare(String(a.issuedAt ?? "")))
    .slice(0, 5)
    .map((c) => ({
      id: String(c.id ?? ""),
      certificateNumber: String(c.certificateNumber ?? ""),
      studentName: String(c.studentName ?? ""),
      courseName: String(c.courseName ?? ""),
      status: String(c.status ?? "issued"),
    }));

  return {
    metrics: {
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === "active").length,
      newAdmissionsCount: newAdmissions.length,
      totalCourses: courses.length,
      activeBatches: batches.filter((b) => b.status === "active").length,
      totalStaff: staffSnap.size,
      todayAttendanceTotal: todayAttendance.length,
      todayAttendancePresent: presentToday,
      monthlyCollectionPaise,
      pendingFeesPaise,
    },
    attendanceSummary: {
      present: presentToday,
      absent: absentToday,
      leave: leaveToday,
    },
    recentAdmissions,
    recentFeeTransactions,
    pendingDuesList,
    upcomingExams,
    recentCertificates,
  };
}
