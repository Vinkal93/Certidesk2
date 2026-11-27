import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listStudentAssignedExams } from "@/services/online-exam.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentExamHistoryPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/login/student");

  const data = await listStudentAssignedExams(user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exam Attempt History ({data.attempts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-border divide-y text-xs">
          {data.attempts.length === 0 ? (
            <p className="text-muted py-6 text-center">No exam attempts recorded yet.</p>
          ) : (
            data.attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-foreground font-semibold">{a.examTitle}</p>
                  <p className="text-muted">
                    Attempt #{a.attemptNumber} · Started {a.startedAt.slice(0, 16)}
                  </p>
                </div>
                <Badge variant={a.status === "in_progress" ? "warning" : "success"}>
                  {a.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
