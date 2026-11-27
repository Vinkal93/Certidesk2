import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentPortalContext } from "@/services/student-portal.service";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { StudentShell } from "@/components/student/student-shell";

export const metadata: Metadata = buildPrivateNoIndexMetadata("Student Portal");

export default async function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "student" || !user.studentId || !user.instituteId) {
    redirect("/student/login");
  }

  let ctx;
  try {
    ctx = await getStudentPortalContext(user);
  } catch {
    redirect("/student/login");
  }

  return (
    <StudentShell
      student={ctx.student}
      instituteName={ctx.institute.name}
      unreadNotificationsCount={ctx.unreadNotificationsCount}
    >
      {children}
    </StudentShell>
  );
}
