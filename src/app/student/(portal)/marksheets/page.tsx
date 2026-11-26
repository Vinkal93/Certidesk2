import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentExamsAndResults } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Marksheets",
  robots: { index: false, follow: false },
};

export default async function StudentMarksheetsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { student, institute, publishedMarksheets } =
    await getStudentExamsAndResults(user);

  return (
    <div className="space-y-6">
      {publishedMarksheets.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-10 text-center text-sm">
            No published marksheets available for download yet.
          </CardContent>
        </Card>
      ) : (
        publishedMarksheets.map((ms) => (
          <Card key={ms.id}>
            <CardHeader className="border-border flex flex-row items-start justify-between border-b pb-4">
              <div>
                <p className="text-primary text-xs font-semibold uppercase">
                  {institute.name} ({institute.code})
                </p>
                <CardTitle className="mt-1">
                  {ms.examTitle} — Official Marksheet
                </CardTitle>
                <p className="text-muted text-xs">
                  Student: {student.fullName} ({student.studentCode}) &bull; Batch:{" "}
                  {ms.batchName}
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
                    <th className="py-2 pr-3">Subject</th>
                    <th className="py-2 pr-3">Max Marks</th>
                    <th className="py-2">Obtained Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {ms.marks.map((m) => (
                    <tr key={m.subjectId}>
                      <td className="py-2 pr-3 font-medium">{m.subjectName}</td>
                      <td className="py-2 pr-3">{m.maxMarks}</td>
                      <td className="py-2 font-mono">{m.obtainedMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-border mt-4 flex items-center justify-between border-t pt-3 text-xs font-semibold">
                <span>
                  Total: {ms.totalObtained} / {ms.totalMax}
                </span>
                <span>Percentage: {ms.percentage}%</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
