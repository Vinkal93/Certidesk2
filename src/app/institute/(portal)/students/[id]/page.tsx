import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarCheck2, Edit3, IndianRupee } from "lucide-react";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import {
  getInstituteStudentById,
  getInstituteStudentInsights,
} from "@/services/student.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentDetailClient } from "@/features/students/components/student-detail-client";

export const metadata: Metadata = {
  title: "Student Profile",
  robots: { index: false, follow: false },
};

export default async function InstituteStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }

  const institute = await resolveAuthorizedInstitute(user);
  const { id } = await params;

  let student;
  try {
    student = await getInstituteStudentById(user, id);
  } catch {
    notFound();
  }

  const insights = await getInstituteStudentInsights(user, id);
  const { feePlan, feeBreakdown, recentPayments, attendanceSummary, recentAttendance } =
    insights;

  return (
    <div className="space-y-6">
      <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <Link
            href="/institute/students"
            className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Students
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h2 className="text-foreground text-xl font-bold">{student.fullName}</h2>
            <Badge variant="outline">{student.studentCode}</Badge>
            <Badge
              variant={
                student.status === "active"
                  ? "success"
                  : student.status === "deleted"
                    ? "danger"
                    : "warning"
              }
            >
              {student.status}
            </Badge>
          </div>
          <p className="text-muted mt-1 text-xs">
            {student.courseName} · {student.batchName} · Admitted {student.admissionDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/institute/fees/collect"
            className="border-border bg-background hover:bg-surface text-foreground inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold"
          >
            <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
            Collect Fee
          </Link>
          <Link
            href={`/institute/students/${student.id}/edit`}
            className="bg-primary hover:bg-primary-dark inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white"
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Student
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Email</p>
            <p className="text-foreground mt-1 truncate text-xs font-semibold">
              {student.email}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Phone</p>
            <p className="text-foreground mt-1 text-xs font-semibold">
              {student.phone || "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Guardian</p>
            <p className="text-foreground mt-1 text-xs font-semibold">
              {student.guardianName || "—"}
              {student.guardianPhone ? ` (${student.guardianPhone})` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Course &amp; Batch</p>
            <p className="text-foreground mt-1 text-xs font-semibold">
              {student.courseName} · {student.batchName}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Details & Attendance Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <IndianRupee className="text-primary h-4 w-4" aria-hidden="true" />
              Fee Details &amp; Monthly Schedule
            </CardTitle>
            {feeBreakdown ? (
              <Badge
                variant={
                  feeBreakdown.overallStatus === "PAID"
                    ? "success"
                    : feeBreakdown.overallStatus === "OVERDUE"
                      ? "danger"
                      : feeBreakdown.overallStatus === "DUE"
                        ? "warning"
                        : "primary"
                }
              >
                {feeBreakdown.overallStatus}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {!feePlan ? (
              <div className="text-muted py-6 text-center">
                No fee plan assigned yet.{" "}
                <Link
                  href="/institute/fees/collect"
                  className="text-primary font-semibold hover:underline"
                >
                  Collect Fee →
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border-border bg-surface rounded-xl border p-3">
                    <p className="text-muted text-[10px]">Total Fee</p>
                    <p className="text-foreground mt-0.5 text-sm font-bold tabular-nums">
                      ₹{(feePlan.totalFeePaise / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="border-border bg-surface rounded-xl border p-3">
                    <p className="text-muted text-[10px]">Paid</p>
                    <p className="text-success mt-0.5 text-sm font-bold tabular-nums">
                      ₹{(feePlan.paidPaise / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="border-border bg-surface rounded-xl border p-3">
                    <p className="text-muted text-[10px]">Pending Due</p>
                    <p className="text-danger mt-0.5 text-sm font-bold tabular-nums">
                      ₹{(feePlan.pendingPaise / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                {feeBreakdown && feeBreakdown.installments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-border bg-surface text-muted border-b">
                        <tr>
                          <th className="px-2.5 py-2 font-semibold">Installment</th>
                          <th className="px-2.5 py-2 font-semibold">Due Date</th>
                          <th className="px-2.5 py-2 font-semibold">Amount</th>
                          <th className="px-2.5 py-2 font-semibold">Pending</th>
                          <th className="px-2.5 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-border divide-y">
                        {feeBreakdown.installments.map((inst) => (
                          <tr key={`${inst.index}_${inst.label}`}>
                            <td className="px-2.5 py-2 font-medium">{inst.label}</td>
                            <td className="text-muted px-2.5 py-2">{inst.dueDate}</td>
                            <td className="px-2.5 py-2 tabular-nums">
                              ₹{(inst.amountPaise / 100).toFixed(0)}
                            </td>
                            <td className="px-2.5 py-2 font-semibold tabular-nums">
                              ₹{(inst.pendingPaise / 100).toFixed(0)}
                            </td>
                            <td className="px-2.5 py-2">
                              <Badge
                                variant={
                                  inst.status === "PAID"
                                    ? "success"
                                    : inst.status === "OVERDUE"
                                      ? "danger"
                                      : inst.status === "DUE"
                                        ? "warning"
                                        : "primary"
                                }
                              >
                                {inst.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {recentPayments.length > 0 ? (
                  <div className="border-border border-t pt-3">
                    <p className="text-foreground mb-2 font-semibold">
                      Recent Payments ({recentPayments.length})
                    </p>
                    <div className="divide-border divide-y">
                      {recentPayments.slice(0, 5).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-1.5"
                        >
                          <div>
                            <span className="font-mono font-semibold">{p.receiptNo}</span>{" "}
                            <span className="text-muted">
                              · {p.paymentMode.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-success font-semibold tabular-nums">
                              +₹{(p.amountPaise / 100).toFixed(2)}
                            </span>
                            <span className="text-muted ml-2 text-[10px]">
                              {new Date(p.paidAt || p.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck2 className="text-primary h-4 w-4" aria-hidden="true" />
              Attendance Details
            </CardTitle>
            <Badge
              variant={
                attendanceSummary.percentage >= 75
                  ? "success"
                  : attendanceSummary.totalDays === 0
                    ? "outline"
                    : "warning"
              }
            >
              {attendanceSummary.percentage}%
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="border-border bg-surface rounded-xl border p-2.5">
                <p className="text-muted text-[10px]">Present</p>
                <p className="text-success mt-0.5 text-base font-bold tabular-nums">
                  {attendanceSummary.presentDays}
                </p>
              </div>
              <div className="border-border bg-surface rounded-xl border p-2.5">
                <p className="text-muted text-[10px]">Absent</p>
                <p className="text-danger mt-0.5 text-base font-bold tabular-nums">
                  {attendanceSummary.absentDays}
                </p>
              </div>
              <div className="border-border bg-surface rounded-xl border p-2.5">
                <p className="text-muted text-[10px]">Leave</p>
                <p className="text-foreground mt-0.5 text-base font-bold tabular-nums">
                  {attendanceSummary.leaveDays}
                </p>
              </div>
            </div>

            {recentAttendance.length === 0 ? (
              <p className="text-muted py-6 text-center">
                No attendance records marked yet.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-border bg-surface text-muted border-b">
                    <tr>
                      <th className="px-2.5 py-2 font-semibold">Date</th>
                      <th className="px-2.5 py-2 font-semibold">Status</th>
                      <th className="px-2.5 py-2 font-semibold">Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {recentAttendance.map((att) => (
                      <tr key={att.id}>
                        <td className="px-2.5 py-2 font-medium">{att.date}</td>
                        <td className="px-2.5 py-2">
                          <Badge
                            variant={
                              att.status === "present"
                                ? "success"
                                : att.status === "absent"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {att.status}
                          </Badge>
                        </td>
                        <td className="text-muted px-2.5 py-2">{att.batchName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <StudentDetailClient
        initialStudent={student}
        profileUpdateFeePaise={institute.pricing.profileUpdateFeePaise}
      />
    </div>
  );
}
