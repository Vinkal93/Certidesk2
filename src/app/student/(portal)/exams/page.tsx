import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/security/session";
import { listStudentAssignedExams } from "@/services/online-exam.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentOnlineExamsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/login/student");

  const data = await listStudentAssignedExams(user);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assigned Online Examinations ({data.exams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-border divide-y text-xs">
            {data.exams.length === 0 ? (
              <p className="text-muted py-6 text-center">
                No online examinations assigned to your batch yet.
              </p>
            ) : (
              data.exams.map((exam) => {
                const attempt = data.attempts.find((a) => a.examId === exam.id);
                const result = data.declaredResults.find((r) => r.examId === exam.id);
                return (
                  <div
                    key={exam.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                  >
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        {exam.title} ({exam.code})
                      </p>
                      <p className="text-muted">
                        Duration: {exam.durationMinutes} min · Max {exam.maxMarks} marks ·
                        Window: {exam.windowStartAt.slice(0, 10)} →{" "}
                        {exam.windowEndAt.slice(0, 10)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {result ? (
                        <Badge variant={result.passed ? "success" : "danger"}>
                          {result.obtainedMarks}/{result.maxMarks} ({result.grade})
                        </Badge>
                      ) : attempt ? (
                        <Link
                          href={`/student/exams/${exam.id}/attempt/${attempt.id}`}
                          className="text-primary font-semibold hover:underline"
                        >
                          {attempt.status === "in_progress"
                            ? "Resume Attempt →"
                            : `Attempt ${attempt.status}`}
                        </Link>
                      ) : (
                        <form
                          action={`/api/student/exams`}
                          method="POST"
                          className="inline"
                        >
                          <Badge variant="primary">{exam.status}</Badge>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
