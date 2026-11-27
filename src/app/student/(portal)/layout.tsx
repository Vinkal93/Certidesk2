import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentPortalContext } from "@/services/student-portal.service";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { StudentShell } from "@/components/student/student-shell";
import { MaintenanceLockdownScreen } from "@/components/emergency/maintenance-lockdown-screen";
import { evaluatePlatformPolicy } from "@/services/emergency-policy.service";

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

  const policy = await evaluatePlatformPolicy({
    instituteId: ctx.institute.id,
    actorRole: user.role,
  });
  if (policy.blocked) {
    return <MaintenanceLockdownScreen policy={policy} portalLabel="Student Portal" />;
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
