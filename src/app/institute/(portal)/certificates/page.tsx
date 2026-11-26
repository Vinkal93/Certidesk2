import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { listInstituteStudents } from "@/services/student.service";
import { listInstituteCertificates } from "@/services/certificate.service";
import { CertificatesClient } from "@/features/institutes/components/certificates-client";

export const metadata: Metadata = {
  title: "Certificates",
  robots: { index: false, follow: false },
};

export default async function InstituteCertificatesPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "certificates:read")) {
    redirect("/institute/dashboard");
  }

  const [institute, students, certificates] = await Promise.all([
    resolveAuthorizedInstitute(user),
    hasStaffPermission(user, "students:read")
      ? listInstituteStudents(user)
      : Promise.resolve([]),
    listInstituteCertificates(user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Certificate Management
        </h2>
        <p className="text-muted text-sm">
          Generate verifiable completion certificates with unique serial numbers and
          public verification links.
        </p>
      </div>
      <CertificatesClient
        students={students}
        initialCertificates={certificates}
        certificateFeePaise={institute.pricing.certificateFeePaise}
        canIssue={hasStaffPermission(user, "certificates:issue")}
      />
    </div>
  );
}
