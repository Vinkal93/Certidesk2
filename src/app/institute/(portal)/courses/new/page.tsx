import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listCourses } from "@/services/academic.service";
import { CoursesClient } from "@/features/institutes/components/courses-client";

export const metadata: Metadata = {
  title: "New Course",
  robots: { index: false, follow: false },
};

export default async function NewCoursePage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/login/institute");
  }
  if (!hasStaffPermission(user, "courses:write")) {
    redirect("/institute/courses");
  }
  const courses = await listCourses(user);
  return (
    <div className="space-y-4">
      <Link
        href="/institute/courses"
        className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Courses
      </Link>
      <CoursesClient initialCourses={courses} canWrite={true} />
    </div>
  );
}
