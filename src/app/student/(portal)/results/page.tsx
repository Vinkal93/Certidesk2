import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentExamsAndResults } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Published Results",
  robots: { index: false, follow: false },
};

export default async function StudentResultsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { publishedMarksheets } = await getStudentExamsAndResults(user);

  return (
    <div className="space-y-4">
      {publishedMarksheets.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-10 text-center text-sm">
            No published examination results available yet.
          </CardContent>
        </Card>
      ) : (
        publishedMarksheets.map((ms) => (
          <Card key={ms.id}>
            <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
              <div>
                <CardTitle className="text-base">{ms.examTitle}</CardTitle>
                <p className="text-muted text-xs">{ms.batchName}</p>
              </div>
              <Badge variant={ms.result === "PASS" ? "success" : "danger"}>
                {ms.result} &bull; {ms.percentage}% ({ms.grade})
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-border text-muted border-b uppercase">
                    <th className="py-1.5 pr-3">Subject</th>
                    <th className="py-1.5 pr-3">Max Marks</th>
                    <th className="py-1.5">Obtained</th>
                  </tr>
                </thead>
                <tbody className="divide-border/60 divide-y">
                  {ms.marks.map((entry) => (
                    <tr key={entry.subjectId}>
                      <td className="py-2 pr-3 font-medium">{entry.subjectName}</td>
                      <td className="py-2 pr-3">{entry.maxMarks}</td>
                      <td className="py-2 font-mono">{entry.obtainedMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
