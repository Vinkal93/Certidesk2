import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listCourses } from "@/services/academic.service";
import { CoursesClient } from "@/features/institutes/components/courses-client";

export const metadata: Metadata = {
  title: "Courses & Subjects",
  robots: { index: false, follow: false },
};

export default async function InstituteCoursesPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "courses:read")) {
    redirect("/institute/dashboard");
  }

  const courses = await listCourses(user);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Courses &amp; Custom Subjects
        </h2>
        <p className="text-muted text-sm">
          Define institute programs, fee structures, and ordered subject lists.
        </p>
      </div>
      <CoursesClient
        initialCourses={courses}
        canWrite={hasStaffPermission(user, "courses:write")}
      />
    </div>
  );
}
