import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthError, getSessionUser } from "@/lib/security/session";
import { getCourseById } from "@/services/academic.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Course Details",
  robots: { index: false, follow: false },
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/login/institute");
  }
  const { courseId } = await params;

  let course;
  try {
    course = await getCourseById(user, courseId);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/institute/courses"
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Courses
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-foreground text-2xl font-bold tracking-tight">
            {course.name}
          </h2>
          <Badge variant={course.status === "active" ? "success" : "outline"}>
            {course.status}
          </Badge>
        </div>
        <p className="text-muted text-xs">
          Code: {course.code} · Duration: {course.duration} · Fee: ₹
          {(course.feePaise / 100).toFixed(2)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Subjects ({course.subjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-border divide-y text-sm">
            {course.subjects.length === 0 ? (
              <p className="text-muted py-4 text-xs">No custom subjects added yet.</p>
            ) : (
              course.subjects.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-foreground font-medium">{sub.name}</p>
                    <p className="text-muted text-xs">
                      {sub.code} · Order #{sub.order}
                    </p>
                  </div>
                  <span className="text-foreground text-xs font-semibold tabular-nums">
                    Max {sub.maxMarks} marks
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
