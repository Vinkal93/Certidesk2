import type { Metadata } from "next";
import Link from "next/link";
import { Award, ShieldAlert, ShieldCheck } from "lucide-react";
import { getCertificateByVerificationId } from "@/services/certificate.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Awards } from "@/components/ui/award";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Verify Certificate",
  description: "Public certificate verification portal for CertiDesk Pro.",
};

export default async function PublicCertificateVerifyPage({
  params,
}: {
  params: Promise<{ verificationId: string }>;
}) {
  const { verificationId } = await params;
  const cert = await getCertificateByVerificationId(verificationId);

  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm">
          <Card elevated>
            <CardHeader className="items-center text-center">
              <div
                className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
                  cert && cert.status === "issued"
                    ? "bg-success-soft text-success"
                    : "bg-danger-soft text-danger"
                }`}
              >
                {cert && cert.status === "issued" ? (
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                )}
              </div>
              <Badge
                variant={
                  cert && cert.status === "issued"
                    ? "success"
                    : cert?.status === "revoked"
                      ? "danger"
                      : "outline"
                }
              >
                {cert
                  ? cert.status === "issued"
                    ? "Verified Authentic"
                    : "Certificate Revoked"
                  : "Not Found"}
              </Badge>
              <CardTitle className="mt-2 text-2xl">Certificate Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!cert ? (
                <p className="text-muted text-center text-sm">
                  No certificate matched verification ID{" "}
                  <span className="text-foreground font-mono font-semibold">
                    {verificationId}
                  </span>
                  .
                </p>
              ) : (
                <div className="border-border bg-surface space-y-2.5 rounded-xl border p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Certificate No</span>
                    <span className="font-mono font-semibold">
                      {cert.certificateNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Recipient</span>
                    <span className="text-foreground font-semibold">
                      {cert.studentName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Course</span>
                    <span className="text-foreground font-medium">{cert.courseName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Grade</span>
                    <span className="text-foreground font-medium">{cert.grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Issuing Institute</span>
                    <span className="text-foreground font-medium">
                      {cert.instituteName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Issue Date</span>
                    <span className="font-mono text-xs">
                      {cert.issuedAt.slice(0, 10)}
                    </span>
                  </div>
                  {cert.status === "revoked" && cert.revokeReason && (
                    <div className="border-border text-danger border-t pt-2 text-xs">
                      Revocation Reason: {cert.revokeReason}
                    </div>
                  )}
                  <div className="pt-4">
                    <Awards
                      variant="stamp"
                      title={cert.status === "issued" ? "CERTIDESK VERIFIED" : "REVOKED"}
                      subtitle={cert.instituteName}
                      recipient={cert.studentName}
                      date={cert.issuedAt.slice(0, 10)}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <Link href="/" className={buttonVariants({ variant: "outline" })}>
                  <Award className="h-4 w-4" aria-hidden="true" />
                  CertiDesk Platform
                </Link>
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </PageContainer>
  );
}
