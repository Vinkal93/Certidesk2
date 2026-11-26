import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, ExternalLink } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { listStudentOwnCertificates } from "@/services/certificate.service";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "My Certificates",
  robots: { index: false, follow: false },
};

export default async function StudentCertificatesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student" || !user.studentId || !user.instituteId) {
    redirect("/student/login");
  }

  const certificates = await listStudentOwnCertificates(user.studentId, user.instituteId);

  if (certificates.length === 0) {
    return (
      <EmptyState
        icon={<Award className="h-6 w-6" aria-hidden="true" />}
        title="No certificates issued yet"
        description="Once your institute approves and issues a completion or merit certificate for your enrollment, it will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {certificates.map((cert) => (
        <div
          key={cert.id}
          className="border-border bg-background flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold">
                {cert.certificateNumber}
              </span>
              <Badge variant={cert.status === "issued" ? "success" : "danger"}>
                {cert.status === "issued" ? "Verified Valid" : "Revoked"}
              </Badge>
            </div>
            <p className="text-foreground mt-1 text-sm font-medium">
              {cert.courseName} &bull; Grade: {cert.grade}
            </p>
            <p className="text-muted text-xs">
              Issued: {cert.issuedAt.slice(0, 10)}
              {cert.status === "revoked" && cert.revokeReason
                ? ` • Reason: ${cert.revokeReason}`
                : ""}
            </p>
          </div>
          {cert.status === "issued" ? (
            <Link
              href={`/verify/${cert.verificationId}`}
              target="_blank"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Verify &amp; Print
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <Badge variant="danger">Download Disabled (Revoked)</Badge>
          )}
        </div>
      ))}
    </div>
  );
}
