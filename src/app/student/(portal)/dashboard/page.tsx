import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Bell, CalendarCheck, FileSpreadsheet, IndianRupee } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { getStudentDashboardData } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Student Dashboard",
  robots: { index: false, follow: false },
};

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const data = await getStudentDashboardData(user);
  const { student, institute } = data;

  return (
    <div className="space-y-6">
      {student.mustChangePassword && (
        <div className="bg-warning-soft flex flex-col justify-between gap-3 rounded-xl border border-amber-200 p-4 sm:flex-row sm:items-center">
          <p className="text-warning text-sm font-medium">
            For your security, please update your initial password before continuing.
          </p>
          <Link
            href="/student/settings"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Change Password
          </Link>
        </div>
      )}

      {/* Student Header Summary */}
      <Card>
        <CardContent className="flex flex-col justify-between gap-4 pt-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="primary">{student.studentCode}</Badge>
              <Badge variant="success">{student.status}</Badge>
            </div>
            <h2 className="text-foreground mt-2 text-2xl font-bold">
              {student.fullName}
            </h2>
            <p className="text-muted text-sm">
              {institute.name} &bull; {student.courseName} ({student.batchName})
            </p>
          </div>
          <div className="text-muted text-xs sm:text-right">
            <p>
              Admission Date:{" "}
              <span className="text-foreground font-mono font-medium">
                {student.admissionDate ?? student.createdAt.slice(0, 10)}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-muted text-xs">Attendance</p>
              <CalendarCheck className="text-primary h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {data.attendancePct !== null ? `${data.attendancePct}%` : "No logs"}
            </p>
            <p className="text-muted text-[11px]">
              {data.attendanceTotalDays} recorded day(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-muted text-xs">Upcoming Exams</p>
              <FileSpreadsheet className="text-primary h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data.upcomingExams.length}</p>
            <p className="text-muted text-[11px]">Scheduled assessments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-muted text-xs">Certificates</p>
              <Award className="text-primary h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data.certificateCount}</p>
            <p className="text-muted text-[11px]">Verified credentials</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-muted text-xs">Pending Fees</p>
              <IndianRupee className="text-primary h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              ₹{(data.feeSummary.pendingFeePaise / 100).toFixed(0)}
            </p>
            <p className="text-muted text-[11px]">
              Paid: ₹{(data.feeSummary.paidFeePaise / 100).toFixed(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base">Latest Published Results</CardTitle>
            <Link
              href="/student/results"
              className="text-primary text-xs font-medium hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {data.publishedResults.length === 0 ? (
              <p className="text-muted text-sm">No published results yet.</p>
            ) : (
              <div className="space-y-2">
                {data.publishedResults.map((res) => (
                  <div
                    key={res.id}
                    className="border-border bg-surface/50 flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{res.examTitle}</p>
                      <p className="text-muted text-xs">
                        {res.totalObtained}/{res.totalMax} ({res.percentage}%)
                      </p>
                    </div>
                    <Badge variant={res.result === "PASS" ? "success" : "danger"}>
                      {res.result} ({res.grade})
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Bell className="text-primary h-4 w-4" aria-hidden="true" />
              <CardTitle className="text-base">Recent Notifications</CardTitle>
            </div>
            <Link
              href="/student/notifications"
              className="text-primary text-xs font-medium hover:underline"
            >
              Open inbox
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {data.recentNotifications.length === 0 ? (
              <p className="text-muted text-sm">No notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recentNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="border-border bg-surface/50 rounded-lg border px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{n.category}</Badge>
                      {!n.read && <Badge variant="primary">New</Badge>}
                    </div>
                    <p className="text-foreground mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
