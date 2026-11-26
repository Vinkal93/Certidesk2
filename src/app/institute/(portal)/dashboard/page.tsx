import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  BookOpen,
  CalendarCheck,
  FileSpreadsheet,
  IndianRupee,
  Layers,
  Plus,
  UserCheck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import {
  getInstituteDashboardData,
  type DashboardDateRange,
} from "@/services/institute-dashboard.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Institute Dashboard",
  robots: { index: false, follow: false },
};

const rangeOptions: { label: string; value: DashboardDateRange }[] = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "All Time", value: "all" },
];

export default async function InstituteDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }

  const institute = await resolveAuthorizedInstitute(user);
  const { range: rawRange } = await searchParams;
  const range: DashboardDateRange =
    rawRange === "7d" || rawRange === "30d" || rawRange === "90d" || rawRange === "all"
      ? rawRange
      : "30d";

  const data = await getInstituteDashboardData(institute.id, range);
  const { metrics } = data;

  const attendancePct =
    metrics.todayAttendanceTotal > 0
      ? Math.round((metrics.todayAttendancePresent / metrics.todayAttendanceTotal) * 100)
      : null;

  const kpiCards = [
    { label: "Total Students", value: String(metrics.totalStudents), icon: Users },
    { label: "Active Students", value: String(metrics.activeStudents), icon: UserCheck },
    {
      label: `Admissions (${range === "all" ? "All" : range})`,
      value: String(metrics.newAdmissionsCount),
      icon: Plus,
    },
    { label: "Total Courses", value: String(metrics.totalCourses), icon: BookOpen },
    { label: "Active Batches", value: String(metrics.activeBatches), icon: Layers },
    { label: "Total Staff", value: String(metrics.totalStaff), icon: UserCog },
    {
      label: "Today's Attendance",
      value: attendancePct !== null ? `${attendancePct}%` : "No logs",
      icon: CalendarCheck,
    },
    {
      label: "Monthly Fee Collection",
      value: `₹${(metrics.monthlyCollectionPaise / 100).toFixed(0)}`,
      icon: IndianRupee,
    },
    {
      label: "Pending Fees",
      value: `₹${(metrics.pendingFeesPaise / 100).toFixed(0)}`,
      icon: FileSpreadsheet,
    },
    {
      label: "Platform Wallet",
      value: `₹${(institute.walletBalancePaise / 100).toFixed(2)}`,
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Date Filter + Quick Actions */}
      <div className="border-border bg-background flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-foreground text-sm font-semibold">{institute.name}</p>
          <p className="text-muted text-xs">
            Live operational overview &bull; Institute Code:{" "}
            <span className="font-mono">{institute.code}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="border-border bg-surface flex rounded-lg border p-0.5">
            {rangeOptions.map((opt) => (
              <Link
                key={opt.value}
                href={`/institute/dashboard?range=${opt.value}`}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === opt.value
                    ? "bg-navy text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          <Link
            href="/institute/students/new"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Admit Student
          </Link>
          <Link
            href="/institute/fees"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Collect Fee
          </Link>
          <Link
            href="/institute/attendance"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Mark Attendance
          </Link>
        </div>
      </div>

      {/* 10 KPI Widgets */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted text-xs font-medium">{kpi.label}</p>
                  <Icon className="text-primary h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-foreground mt-2 text-2xl font-bold tracking-tight">
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Operational Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Admissions */}
        <Card>
          <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base">Recent Admissions</CardTitle>
            <Link
              href="/institute/students"
              className="text-primary text-xs font-medium hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {data.recentAdmissions.length === 0 ? (
              <p className="text-muted text-sm">No student admissions recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.recentAdmissions.map((stu) => (
                  <Link
                    key={stu.id}
                    href={`/institute/students/${stu.id}`}
                    className="border-border/80 bg-surface/50 hover:bg-surface flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-foreground font-medium">{stu.fullName}</p>
                      <p className="text-muted text-xs">
                        {stu.studentCode} &bull; {stu.courseName}
                      </p>
                    </div>
                    <Badge variant={stu.status === "active" ? "success" : "danger"}>
                      {stu.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Fee Transactions */}
        <Card>
          <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base">Recent Fee Collections</CardTitle>
            <Link
              href="/institute/fees"
              className="text-primary text-xs font-medium hover:underline"
            >
              Fee ledger
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {data.recentFeeTransactions.length === 0 ? (
              <p className="text-muted text-sm">No student fee payments recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.recentFeeTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="border-border/80 bg-surface/50 flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-foreground font-medium">{tx.studentName}</p>
                      <p className="text-muted font-mono text-xs">
                        {tx.receiptNo} &bull; {tx.paymentMode}
                      </p>
                    </div>
                    <span className="text-success font-semibold">
                      +₹{(tx.amountPaise / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Fee Dues */}
        <Card>
          <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base">Pending Fee Dues</CardTitle>
            <Link
              href="/institute/fees"
              className="text-primary text-xs font-medium hover:underline"
            >
              Manage dues
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {data.pendingDuesList.length === 0 ? (
              <p className="text-muted text-sm">No pending student dues.</p>
            ) : (
              <div className="space-y-2.5">
                {data.pendingDuesList.map((due) => (
                  <div
                    key={due.id}
                    className="border-border/80 bg-surface/50 flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-foreground font-medium">{due.studentName}</p>
                      <p className="text-muted text-xs">{due.courseName}</p>
                    </div>
                    <Badge variant="warning">
                      ₹{(due.pendingPaise / 100).toFixed(2)} due
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance, Exams & Certificates Summary */}
        <Card>
          <CardHeader className="border-border border-b pb-3">
            <CardTitle className="text-base">
              Today&apos;s Attendance, Exams &amp; Certificates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm">
            <div className="border-border bg-surface grid grid-cols-3 gap-2 rounded-lg border p-3 text-center">
              <div>
                <p className="text-muted text-xs">Present</p>
                <p className="text-success text-lg font-bold">
                  {data.attendanceSummary.present}
                </p>
              </div>
              <div>
                <p className="text-muted text-xs">Absent</p>
                <p className="text-danger text-lg font-bold">
                  {data.attendanceSummary.absent}
                </p>
              </div>
              <div>
                <p className="text-muted text-xs">Leave</p>
                <p className="text-warning text-lg font-bold">
                  {data.attendanceSummary.leave}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-muted text-xs font-semibold uppercase">
                  Upcoming Examinations
                </p>
                <Link
                  href="/institute/examinations"
                  className="text-primary text-xs hover:underline"
                >
                  Schedule
                </Link>
              </div>
              {data.upcomingExams.length === 0 ? (
                <p className="text-muted text-xs">No upcoming examinations scheduled.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.upcomingExams.map((ex) => (
                    <li key={ex.id} className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">
                        {ex.title} ({ex.batchName})
                      </span>
                      <span className="text-muted font-mono">{ex.examDate}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-muted text-xs font-semibold uppercase">
                  Recent Certificates
                </p>
                <Link
                  href="/institute/certificates"
                  className="text-primary text-xs hover:underline"
                >
                  Registry
                </Link>
              </div>
              {data.recentCertificates.length === 0 ? (
                <p className="text-muted text-xs">No certificates issued yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.recentCertificates.map((cert) => (
                    <li
                      key={cert.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-foreground flex items-center gap-1.5 font-medium">
                        <Award className="text-primary h-3.5 w-3.5" aria-hidden="true" />
                        {cert.studentName}
                      </span>
                      <span className="text-muted font-mono">
                        {cert.certificateNumber}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
