import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { getInstituteDashboardData } from "@/services/institute-dashboard.service";
import {
  ReportsClient,
  type ReportSummaryRow,
} from "@/features/institutes/components/reports-client";

export const metadata: Metadata = {
  title: "Reports & Analytics",
  robots: { index: false, follow: false },
};

export default async function InstituteReportsPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "reports:read")) {
    redirect("/institute/dashboard");
  }

  const institute = await resolveAuthorizedInstitute(user);
  const data = await getInstituteDashboardData(institute.id, "all");

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
          Consolidated live reports across students, attendance, fees, exams,
          certificates, and wallet.
        </p>
      </div>
      <ReportsClient rows={rows} />
    </div>
  );
}
