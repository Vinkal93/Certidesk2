import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentExamsAndResults } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Examinations",
  robots: { index: false, follow: false },
};

export default async function StudentExaminationsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { exams } = await getStudentExamsAndResults(user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Examination Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {exams.length === 0 ? (
          <p className="text-muted text-sm">No examinations scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {exams.map((ex) => (
              <div
                key={ex.id}
                className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"
              >
                <div>
                  <p className="text-foreground font-semibold">{ex.title}</p>
                  <p className="text-muted text-xs">
                    {ex.batchName} &bull; Date: {ex.examDate} &bull; {ex.subjects.length}{" "}
                    subjects
                  </p>
                </div>
                <Badge variant={ex.status === "published" ? "success" : "outline"}>
                  {ex.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
