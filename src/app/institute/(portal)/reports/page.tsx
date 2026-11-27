import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { feeReceiptsCollection, studentsCollection } from "@/lib/firebase/firestore";
import { getInstituteDashboardData } from "@/services/institute-dashboard.service";
import {
  ReportsClient,
  type InstituteAnalyticsPayload,
  type ReportSummaryRow,
} from "@/features/institutes/components/reports-client";

export const metadata: Metadata = {
  title: "Reports & Analytics",
  robots: { index: false, follow: false },
};

export default async function InstituteReportsPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "reports:read")) {
    redirect("/institute/dashboard");
  }

  const institute = await resolveAuthorizedInstitute(user);
  const [data, receiptsSnap, studentsSnap] = await Promise.all([
    getInstituteDashboardData(institute.id, "all"),
    feeReceiptsCollection().where("instituteId", "==", institute.id).get(),
    studentsCollection().where("instituteId", "==", institute.id).get(),
  ]);

  const receiptSeries = receiptsSnap.docs
    .map((d) => d.data())
    .filter((r) => r.status !== "cancelled")
    .map((r) => ({
      date: (r.issuedAt || "").slice(0, 10),
      amountPaise: r.amountPaise ?? 0,
    }))
    .filter((r) => r.date.length === 10);

  const admissionSeries = studentsSnap.docs
    .map((d) => ({
      date: (d.data().admissionDate || d.data().createdAt || "").slice(0, 10),
    }))
    .filter((a) => a.date.length === 10);

  const analytics: InstituteAnalyticsPayload = {
    kpis: {
      totalStudents: data.metrics.totalStudents,
      activeStudents: data.metrics.activeStudents,
      totalCourses: data.metrics.totalCourses,
      activeBatches: data.metrics.activeBatches,
      feeCollectedPaise: data.metrics.monthlyCollectionPaise,
      pendingDuesPaise: data.metrics.pendingFeesPaise,
      attendancePresent: data.attendanceSummary.present,
      attendanceAbsent: data.attendanceSummary.absent,
      attendanceLeave: data.attendanceSummary.leave,
      totalCertificates: data.recentCertificates.length,
      upcomingExams: data.upcomingExams.length,
      walletBalancePaise: institute.walletBalancePaise,
    },
    receiptSeries,
    admissionSeries,
  };

  const rows: ReportSummaryRow[] = [
    {
      category: "Students",
      metric: "Total Enrolled Students",
      value: String(data.metrics.totalStudents),
      detail: `${data.metrics.activeStudents} active`,
    },
    {
      category: "Courses & Batches",
      metric: "Configured Courses",
      value: String(data.metrics.totalCourses),
      detail: `${data.metrics.activeBatches} active batches`,
    },
    {
      category: "Attendance",
      metric: "Today's Present / Absent / Leave",
      value: `${data.attendanceSummary.present} / ${data.attendanceSummary.absent} / ${data.attendanceSummary.leave}`,
      detail: "Daily batch register",
    },
    {
      category: "Fee Collection",
      metric: "Current Month Collected",
      value: `₹${(data.metrics.monthlyCollectionPaise / 100).toFixed(2)}`,
      detail: "Separate from platform wallet",
    },
    {
      category: "Pending Fees",
      metric: "Total Outstanding Student Dues",
      value: `₹${(data.metrics.pendingFeesPaise / 100).toFixed(2)}`,
      detail: `${data.pendingDuesList.length} student plan(s) with dues`,
    },
    {
      category: "Examinations",
      metric: "Upcoming Scheduled Exams",
      value: String(data.upcomingExams.length),
      detail: "Custom-subject exams",
    },
    {
      category: "Certificates",
      metric: "Recent Issued Certificates",
      value: String(data.recentCertificates.length),
      detail: "Publicly verifiable credentials",
    },
    {
      category: "Platform Wallet",
      metric: "Available Institute Wallet Balance",
      value: `₹${(institute.walletBalancePaise / 100).toFixed(2)}`,
      detail: `Admission fee: ₹${(institute.pricing.admissionFeePaise / 100).toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Reports &amp; Analytics
        </h2>
        <p className="text-muted text-sm">
          Consolidated live reports, date-range filtering, and visual charts across
          students, attendance, fees, exams, certificates, and wallet.
        </p>
      </div>
      <ReportsClient rows={rows} analytics={analytics} />
    </div>
  );
}
