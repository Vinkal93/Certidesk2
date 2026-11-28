import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Edit3, IndianRupee } from "lucide-react";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { getInstituteStudentById } from "@/services/student.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StudentDetailClient } from "@/features/students/components/student-detail-client";

export const metadata: Metadata = {
  title: "Student Profile",
  robots: { index: false, follow: false },
};

export default async function InstituteStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }

  const institute = await resolveAuthorizedInstitute(user);
  const { id } = await params;

  let student;
  try {
    student = await getInstituteStudentById(user, id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <Link
            href="/institute/students"
            className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Students
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h2 className="text-foreground text-xl font-bold">{student.fullName}</h2>
            <Badge variant="outline">{student.studentCode}</Badge>
            <Badge
              variant={
                student.status === "active"
                  ? "success"
                  : student.status === "deleted"
                    ? "danger"
                    : "warning"
              }
            >
              {student.status}
            </Badge>
          </div>
          <p className="text-muted mt-1 text-xs">
            {student.courseName} · {student.batchName} · Admitted {student.admissionDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/institute/fees/collect"
            className="border-border bg-background hover:bg-surface text-foreground inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold"
          >
            <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
            Collect Fee
          </Link>
          <Link
            href={`/institute/students/${student.id}/edit`}
            className="bg-primary hover:bg-primary-dark inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white"
          >
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Student
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Email</p>
            <p className="text-foreground mt-1 truncate text-xs font-semibold">
              {student.email}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Phone</p>
            <p className="text-foreground mt-1 text-xs font-semibold">
              {student.phone || "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Guardian</p>
            <p className="text-foreground mt-1 text-xs font-semibold">
              {student.guardianName || "—"}
              {student.guardianPhone ? ` (${student.guardianPhone})` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Course &amp; Batch</p>
            <p className="text-foreground mt-1 text-xs font-semibold">
              {student.courseName} · {student.batchName}
            </p>
          </CardContent>
        </Card>
      </div>

      <StudentDetailClient
        initialStudent={student}
        profileUpdateFeePaise={institute.pricing.profileUpdateFeePaise}
      />
    </div>
  );
}
