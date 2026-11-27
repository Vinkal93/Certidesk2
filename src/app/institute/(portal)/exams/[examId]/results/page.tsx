import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthError, getInstitutePortalSessionUser } from "@/lib/security/session";
import { getOnlineExamDetails } from "@/services/online-exam.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OnlineExamResultsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/login/institute");
  }
  const { examId } = await params;

  let details;
  try {
    details = await getOnlineExamDetails(user, examId);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    throw error;
  }

  const { exam, attempts, results } = details;
  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/institute/exams"
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Online Exams
        </Link>
        <h2 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
          {exam.title} — Results &amp; Evaluation
        </h2>
        <p className="text-muted text-xs">
          Attempts: {attempts.length} · Evaluated: {results.length} · Passed:{" "}
          {passedCount} · Status: {exam.status}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Results ({results.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-border bg-surface text-muted border-b">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Student ID</th>
                  <th className="px-3 py-2.5 font-semibold">Student</th>
                  <th className="px-3 py-2.5 font-semibold">Marks</th>
                  <th className="px-3 py-2.5 font-semibold">%</th>
                  <th className="px-3 py-2.5 font-semibold">Grade</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted px-3 py-6 text-center">
                      No evaluated attempts yet.
                    </td>
                  </tr>
                ) : (
                  results.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2.5 font-mono">{r.studentCode}</td>
                      <td className="px-3 py-2.5 font-medium">{r.studentName}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {r.obtainedMarks} / {r.maxMarks}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{r.percentage}%</td>
                      <td className="px-3 py-2.5 font-semibold">{r.grade}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={r.passed ? "success" : "danger"}>
                          {r.passed ? "PASS" : "FAIL"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
