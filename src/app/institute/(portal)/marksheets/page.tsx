import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { listExaminations } from "@/services/exam.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Marksheets",
  robots: { index: false, follow: false },
};

export default async function InstituteMarksheetsPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "exams:read")) {
    redirect("/institute/dashboard");
  }

  const [institute, examData] = await Promise.all([
    resolveAuthorizedInstitute(user),
    listExaminations(user),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Print-Ready Marksheets
          </h2>
          <p className="text-muted text-sm">
            Structured subject-wise academic transcripts for {institute.name}.
          </p>
        </div>
        <Link
          href="/institute/examinations"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Manage Exams &amp; Marks
        </Link>
      </div>

      {examData.marksheets.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-10 text-center text-sm">
            No marksheets generated yet. Enter marks in Examinations first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {examData.marksheets.map((ms) => (
            <Card key={ms.id}>
              <CardHeader className="border-border flex flex-row items-start justify-between border-b pb-3">
                <div>
                  <p className="text-primary text-xs font-semibold uppercase">
                    {institute.name} ({institute.code})
                  </p>
                  <CardTitle className="mt-1 text-base">{ms.examTitle}</CardTitle>
                  <p className="text-muted text-xs">
                    {ms.studentName} &bull; {ms.studentCode} &bull; {ms.batchName}
                  </p>
                </div>
                <Badge variant={ms.result === "PASS" ? "success" : "danger"}>
                  {ms.result} ({ms.grade})
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-border text-muted border-b uppercase">
                      <th className="py-1.5 pr-3">Subject</th>
                      <th className="py-1.5 pr-3">Max</th>
                      <th className="py-1.5">Obtained</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/60 divide-y">
                    {ms.marks.map((entry) => (
                      <tr key={entry.subjectId}>
                        <td className="py-1.5 pr-3 font-medium">{entry.subjectName}</td>
                        <td className="py-1.5 pr-3">{entry.maxMarks}</td>
                        <td className="py-1.5 font-mono">{entry.obtainedMarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-border mt-3 flex items-center justify-between border-t pt-2.5 text-xs font-semibold">
                  <span>
                    Total: {ms.totalObtained} / {ms.totalMax}
                  </span>
                  <span>Percentage: {ms.percentage}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
