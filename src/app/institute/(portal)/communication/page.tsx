import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listCommunicationLogs } from "@/services/institute-ops.service";
import { listInstituteStudents } from "@/services/student.service";
import { CommunicationClient } from "@/features/institutes/components/communication-client";

export const metadata: Metadata = {
  title: "Communication",
  robots: { index: false, follow: false },
};

export default async function InstituteCommunicationPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "communication:send")) {
    redirect("/institute/dashboard");
  }

  const [logs, students] = await Promise.all([
    listCommunicationLogs(user),
    hasStaffPermission(user, "students:read")
      ? listInstituteStudents(user)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Communication Center
        </h2>
        <p className="text-muted text-sm">
          Send fee reminders, exam announcements, and certificate notifications to
          students.
        </p>
      </div>
      <CommunicationClient initialLogs={logs} studentCount={students.length} />
    </div>
  );
}
