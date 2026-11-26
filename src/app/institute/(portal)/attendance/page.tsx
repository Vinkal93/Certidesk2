import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listBatches } from "@/services/academic.service";
import { listInstituteStudents } from "@/services/student.service";
import { listAttendanceRecords } from "@/services/attendance.service";
import { AttendanceClient } from "@/features/institutes/components/attendance-client";

export const metadata: Metadata = {
  title: "Attendance",
  robots: { index: false, follow: false },
};

export default async function InstituteAttendancePage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "attendance:read")) {
    redirect("/institute/dashboard");
  }

  const [batches, students, records] = await Promise.all([
    hasStaffPermission(user, "batches:read") ? listBatches(user) : Promise.resolve([]),
    hasStaffPermission(user, "students:read")
      ? listInstituteStudents(user)
      : Promise.resolve([]),
    listAttendanceRecords(user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Attendance Management
        </h2>
        <p className="text-muted text-sm">
          Mark daily batch attendance with duplicate prevention and audit tracking.
        </p>
      </div>
      <AttendanceClient
        batches={batches}
        students={students}
        initialRecords={records}
        canWrite={hasStaffPermission(user, "attendance:write")}
      />
    </div>
  );
}
