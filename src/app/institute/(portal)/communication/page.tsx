import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listCommunicationLogs } from "@/services/institute-ops.service";
import { listInstituteStudents } from "@/services/student.service";
import { listSentPopupMessages } from "@/services/popup-messages.service";
import { CommunicationClient } from "@/features/institutes/components/communication-client";
import { PopupMessageComposer } from "@/components/portal/popup-message-composer";

export const metadata: Metadata = {
  title: "Communication & Fee Reminders",
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

  const [logs, students, sentPopups] = await Promise.all([
    listCommunicationLogs(user),
    hasStaffPermission(user, "students:read")
      ? listInstituteStudents(user)
      : Promise.resolve([]),
    listSentPopupMessages(user),
  ]);

  const studentTargets = students.map((s) => ({
    id: s.id,
    label: `${s.fullName} (${s.studentCode})`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Communication Center &amp; Popup Reminders
        </h2>
        <p className="text-muted text-sm">
          Send first-time popup fee reminders, exam notices, and alerts directly to
          students (persistent in their notification bell).
        </p>
      </div>
      <PopupMessageComposer
        mode="institute_admin"
        targets={studentTargets}
        initialSent={sentPopups}
      />
      <CommunicationClient initialLogs={logs} studentCount={students.length} />
    </div>
  );
}
