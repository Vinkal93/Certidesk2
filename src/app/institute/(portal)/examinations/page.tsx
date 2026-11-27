import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listBatches } from "@/services/academic.service";
import { listInstituteStudents } from "@/services/student.service";
import { listExaminations } from "@/services/exam.service";
import { ExamsClient } from "@/features/institutes/components/exams-client";

export const metadata: Metadata = {
  title: "Examinations",
  robots: { index: false, follow: false },
};

export default async function InstituteExaminationsPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "exams:read")) {
    redirect("/institute/dashboard");
  }

  const [batches, students, examData] = await Promise.all([
    hasStaffPermission(user, "batches:read") ? listBatches(user) : Promise.resolve([]),
    hasStaffPermission(user, "students:read")
      ? listInstituteStudents(user)
      : Promise.resolve([]),
    listExaminations(user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Examinations &amp; Marks Entry
        </h2>
        <p className="text-muted text-sm">
          Create custom-subject examinations, enter marks, compute grades, and publish
          results.
        </p>
      </div>
      <ExamsClient
        batches={batches}
        students={students}
        initialExams={examData.exams}
        initialMarksheets={examData.marksheets}
        canWrite={hasStaffPermission(user, "exams:write")}
      />
    </div>
  );
}
