"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  Printer,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Awards } from "@/components/ui/award";
import { useActionFeedback } from "@/components/ui/action-feedback-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CertificateRecord } from "@/types/academic";
import type { StudentRecord } from "@/types/domain";

export function CertificatesClient({
  students,
  initialCertificates,
  certificateFeePaise,
  canIssue,
}: {
  students: StudentRecord[];
  initialCertificates: CertificateRecord[];
  certificateFeePaise: number;
  canIssue: boolean;
}) {
  const { confirm, runWithBanner } = useActionFeedback();
  const [certificates, setCertificates] = React.useState(initialCertificates);
  const [studentId, setStudentId] = React.useState(students[0]?.id ?? "");
  const [templateId, setTemplateId] = React.useState<"classic" | "modern" | "merit">(
    "classic"
  );
  const [grade, setGrade] = React.useState("A+");
  const [loading, setLoading] = React.useState(false);
  const [selectedCertIds, setSelectedCertIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue",
          studentId,
          templateId,
          grade,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { certificate: CertificateRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to issue certificate.");
        return;
      }
      setCertificates((prev) => [json.data!.certificate, ...prev]);
      setMessage(
        `Certificate ${json.data.certificate.certificateNumber} issued (Verification ID: ${json.data.certificate.verificationId}).`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (certificateId: string) => {
    const resConfirm = await confirm({
      title: "Revoke Certificate?",
      description:
        "This certificate will be marked revoked on the public verification portal.",
      confirmLabel: "Revoke Certificate",
      tone: "destructive",
      requireReason: true,
      reasonLabel: "Revocation Reason",
      reasonPlaceholder: "Revoked by institute administrator",
    });
    if (!resConfirm.confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await runWithBanner({
        title: "Revoking certificate",
        successTitle: "Certificate revoked",
        tone: "warning",
        task: async () => {
          const res = await fetch("/api/institute/certificates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "revoke",
              certificateId,
              reason: resConfirm.reason,
            }),
          });
          const json = (await res.json()) as {
            ok: boolean;
            data?: { certificate: CertificateRecord };
            error?: { message?: string };
          };
          if (!res.ok || !json.ok || !json.data) {
            throw new Error(json.error?.message ?? "Failed to revoke certificate.");
          }
          setCertificates((prev) =>
            prev.map((c) => (c.id === certificateId ? json.data!.certificate : c))
          );
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke certificate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {canIssue && (
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Generate Certificate</CardTitle>
              <p className="text-muted text-xs">
                Pricing Policy:{" "}
                {certificateFeePaise === 0
                  ? "Included (₹0)"
                  : `₹${(certificateFeePaise / 100).toFixed(2)} per certificate`}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIssue} className="space-y-4">
                <Select
                  label="Select Student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  options={
                    students.length > 0
                      ? students.map((s) => ({
                          label: `${s.fullName} (${s.courseName})`,
                          value: s.id,
                        }))
                      : [{ label: "Admit a student first", value: "" }]
                  }
                  required
                />
                <Select
                  label="Certificate Template"
                  value={templateId}
                  onChange={(e) =>
                    setTemplateId(e.target.value as "classic" | "modern" | "merit")
                  }
                  options={[
                    { label: "Classic Academic Border", value: "classic" },
                    { label: "Modern Minimalist Navy", value: "modern" },
                    { label: "Merit Distinction Seal", value: "merit" },
                  ]}
                />
                <Input
                  label="Grade / Distinction"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  disabled={students.length === 0}
                >
                  <Award className="h-4 w-4" aria-hidden="true" />
                  Issue Certificate
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className={canIssue ? "lg:col-span-7" : "lg:col-span-12"}>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Certificate Registry ({certificates.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {selectedCertIds.length > 0 ? (
                <a
                  href={`/api/institute/certificates/${selectedCertIds[0]}/pdf?bulkIds=${encodeURIComponent(
                    selectedCertIds.join(",")
                  )}`}
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Bulk PDF ({selectedCertIds.length})
                </a>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
                onClick={() => window.print()}
              >
                Print Registry
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {certificates.length === 0 ? (
              <p className="text-muted text-sm">No certificates issued yet.</p>
            ) : (
              <div className="space-y-3">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="border-border flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${cert.certificateNumber}`}
                        checked={selectedCertIds.includes(cert.id)}
                        onChange={(e) =>
                          setSelectedCertIds((prev) =>
                            e.target.checked
                              ? [...prev, cert.id]
                              : prev.filter((id) => id !== cert.id)
                          )
                        }
                        className="mt-1"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-mono text-xs font-semibold">
                            {cert.certificateNumber}
                          </span>
                          <Badge
                            variant={cert.status === "issued" ? "success" : "danger"}
                          >
                            {cert.status}
                          </Badge>
                        </div>
                        <p className="text-foreground mt-1 text-sm font-medium">
                          {cert.studentName} &bull; {cert.courseName} ({cert.grade})
                        </p>
                        <p className="text-muted font-mono text-xs">
                          Verification ID: {cert.verificationId} &bull; Template:{" "}
                          {cert.templateId}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {cert.status === "issued" && (
                        <div className="hidden sm:block">
                          <Awards
                            variant="stamp"
                            title="CERTIDESK VERIFIED"
                            subtitle={cert.instituteName}
                            recipient={cert.studentName}
                            date={cert.issuedAt.slice(0, 10)}
                            className="h-20 w-20 scale-90"
                            showIcon={false}
                          />
                        </div>
                      )}
                      <a
                        href={`/api/institute/certificates/${cert.id}/pdf?download=1`}
                        className={buttonVariants({ variant: "primary", size: "sm" })}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        Download PDF
                      </a>
                      <a
                        href={`/api/institute/certificates/${cert.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                        Print
                      </a>
                      <Link
                        href={`/verify/${cert.verificationId}`}
                        target="_blank"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Verify
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      {canIssue && cert.status === "issued" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          loading={loading}
                          onClick={() => handleRevoke(cert.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
