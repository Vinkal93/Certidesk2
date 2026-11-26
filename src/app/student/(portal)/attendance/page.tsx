import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentAttendanceData } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Attendance",
  robots: { index: false, follow: false },
};

export default async function StudentAttendancePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { records, summary } = await getStudentAttendanceData(user);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted text-xs">Working Days</p>
            <p className="mt-1 text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted text-xs">Present</p>
            <p className="text-success mt-1 text-2xl font-bold">{summary.present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted text-xs">Absent</p>
            <p className="text-danger mt-1 text-2xl font-bold">{summary.absent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted text-xs">Leave</p>
            <p className="text-warning mt-1 text-2xl font-bold">{summary.leave}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted text-xs">Attendance %</p>
            <p className="mt-1 text-2xl font-bold">{summary.percentage}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date-Wise Attendance History (Read-Only)</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-muted text-sm">No attendance records recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border text-muted border-b text-xs uppercase">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Batch</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-4 font-mono text-xs">{r.date}</td>
                      <td className="text-muted py-2.5 pr-4">{r.batchName}</td>
                      <td className="py-2.5">
                        <Badge
                          variant={
                            r.status === "present"
                              ? "success"
                              : r.status === "absent"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
