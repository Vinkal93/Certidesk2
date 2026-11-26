import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentCourseAndBatch } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Course & Batch",
  robots: { index: false, follow: false },
};

export default async function StudentCoursePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { student, course, batch } = await getStudentCourseAndBatch(user);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="border-border flex justify-between border-b pb-2">
              <span className="text-muted">Course Name</span>
              <span className="font-semibold">{course?.name ?? student.courseName}</span>
            </div>
            <div className="border-border flex justify-between border-b pb-2">
              <span className="text-muted">Duration</span>
              <span>{course?.duration ?? "Per Institute Schedule"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Status</span>
              <Badge variant="success">{student.status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Batch &amp; Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="border-border flex justify-between border-b pb-2">
              <span className="text-muted">Batch Name</span>
              <span className="font-semibold">{batch?.name ?? student.batchName}</span>
            </div>
            <div className="border-border flex justify-between border-b pb-2">
              <span className="text-muted">Timing</span>
              <span>{batch?.timing ?? "Contact institute"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Assigned Teacher</span>
              <span>{batch?.teacherName ?? "Assigned by Institute"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          {!course || course.subjects.length === 0 ? (
            <p className="text-muted text-sm">
              Subject breakdown will appear once configured by your institute.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {course.subjects.map((sub) => (
                <Badge key={sub.id} variant="primary">
                  {sub.order}. {sub.name} ({sub.maxMarks} marks)
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
