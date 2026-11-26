import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listGlobalStudents } from "@/services/su-platform.service";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Global Student Directory",
  robots: { index: false, follow: false },
};

export default async function SuGlobalStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; instituteId?: string; status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const { search, instituteId, status } = await searchParams;
  const students = await listGlobalStudents(user, { search, instituteId, status });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Global Student Directory
        </h2>
        <p className="text-muted text-sm">
          Cross-institute student enrollment overview (Super Admin audited view).
        </p>
      </div>

      <div className="border-border bg-background overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[700px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border bg-surface/60 text-muted border-b text-xs font-semibold uppercase">
              <th className="px-4 py-3">Student ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Institute</th>
              <th className="px-4 py-3">Course / Batch</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-border/70 divide-y">
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted px-4 py-8 text-center">
                  No students enrolled across the platform yet.
                </td>
              </tr>
            ) : (
              students.map((stu) => (
                <tr key={stu.id}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">
                    {stu.studentCode}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground font-medium">{stu.fullName}</p>
                    <p className="text-muted text-xs">{stu.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">{stu.instituteName}</td>
                  <td className="text-muted px-4 py-3 text-xs">
                    {stu.courseName} &bull; {stu.batchName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={stu.status === "active" ? "success" : "danger"}>
                      {stu.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
