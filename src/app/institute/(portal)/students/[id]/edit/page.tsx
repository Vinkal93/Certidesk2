import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { getInstituteStudentById } from "@/services/student.service";
import { Badge } from "@/components/ui/badge";
import { StudentDetailClient } from "@/features/students/components/student-detail-client";

export const metadata: Metadata = {
  title: "Edit Student",
  robots: { index: false, follow: false },
};

export default async function EditInstituteStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
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
      <div className="border-border border-b pb-4">
        <Link
          href={`/institute/students/${student.id}`}
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Student Profile
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h2 className="text-foreground text-xl font-bold">
            Edit Student — {student.fullName}
          </h2>
          <Badge variant="outline">{student.studentCode}</Badge>
        </div>
      </div>

      <StudentDetailClient
        initialStudent={student}
        profileUpdateFeePaise={institute.pricing.profileUpdateFeePaise}
      />
    </div>
  );
}
