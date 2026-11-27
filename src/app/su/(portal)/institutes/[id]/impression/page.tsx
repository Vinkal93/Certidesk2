import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  ClipboardCheck,
  Eye,
  GraduationCap,
  IndianRupee,
  Layers,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { AuthError, getSessionUser } from "@/lib/security/session";
import { getInstituteLiveImpression } from "@/services/su-impression.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Live Institute Impression",
  robots: { index: false, follow: false },
};

function formatInrFromPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function SuInstituteLiveImpressionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su/login");
  }

  const { id } = await params;
  let data;
  try {
    data = await getInstituteLiveImpression(user, id);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const { institute, subscription, kpis } = data;

  return (
    <div className="space-y-6">
      {/* Live Impression Banner */}
      <div className="border-primary/25 bg-primary/5 flex flex-col justify-between gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
            <Eye className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-primary text-xs font-bold tracking-wide uppercase">
                Super Admin Live Impression
              </span>
              <Badge variant={institute.status === "active" ? "success" : "danger"}>
                {institute.status}
              </Badge>
              {subscription && (
                <Badge variant="navy">
                  {subscription.planName} · ₹{subscription.priceSnapshotRupees}/
                  {subscription.billingCycle === "monthly" ? "mo" : "yr"}
                </Badge>
              )}
            </div>
            <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight">
              {institute.name} ({institute.code})
            </h1>
            <p className="text-muted text-xs">
              Owner: {institute.ownerName} &bull; {institute.email} &bull;{" "}
              {institute.phone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/su/institutes/${institute.id}`}
            className="border-border bg-background text-foreground hover:bg-surface inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Institute Settings
          </Link>
          <Link
            href={`/su/institutes/${institute.id}/wallet`}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white"
          >
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            Wallet &amp; Ledger
          </Link>
        </div>
      </div>

      {/* Live Operational KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              Students
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {kpis.totalStudents}
            </p>
            <p className="text-muted text-[11px]">{kpis.activeStudents} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Staff
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">{kpis.totalStaff}</p>
            <p className="text-muted text-[11px]">Portal accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Courses &amp; Batches
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">{kpis.totalCourses}</p>
            <p className="text-muted text-[11px]">{kpis.totalBatches} batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Exams
            </div>
            <p className="text-foreground mt-1 text-2xl font-bold">{kpis.totalExams}</p>
            <p className="text-muted text-[11px]">
              {kpis.totalCertificates} certs issued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
              Fee Collected
            </div>
            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatInrFromPaise(kpis.feeCollectedPaise)}
            </p>
            <p className="text-muted text-[11px]">Real student receipts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
              <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
              Spendable Wallet
            </div>
            <p className="text-foreground mt-1 text-xl font-bold">
              {formatInrFromPaise(kpis.walletTotalPaise)}
            </p>
            <p className="text-muted text-[11px]">
              Paid {formatInrFromPaise(kpis.walletPaidPaise)} · Bonus{" "}
              {formatInrFromPaise(kpis.walletBonusPaise)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Institute Portal Snapshot Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Students */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="text-primary h-4 w-4" aria-hidden="true" />
              Recent Students ({kpis.totalStudents})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentStudents.length === 0 ? (
              <p className="text-muted text-sm">No students admitted yet.</p>
            ) : (
              <div className="divide-border divide-y">
                {data.recentStudents.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div>
                      <p className="text-foreground font-semibold">{s.fullName}</p>
                      <p className="text-muted">
                        {s.studentCode} &bull; {s.email}
                      </p>
                    </div>
                    <Badge variant={s.status === "active" ? "success" : "danger"}>
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Courses & Exams */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="text-primary h-4 w-4" aria-hidden="true" />
              Courses &amp; Examinations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted mb-2 text-xs font-semibold uppercase">
                Courses ({kpis.totalCourses})
              </p>
              {data.recentCourses.length === 0 ? (
                <p className="text-muted text-xs">No courses created yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.recentCourses.map((c) => (
                    <div
                      key={c.id}
                      className="border-border bg-surface flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                    >
                      <span className="text-foreground font-medium">
                        {c.name} ({c.code})
                      </span>
                      <span className="text-muted">{formatInrFromPaise(c.feePaise)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-muted mb-2 text-xs font-semibold uppercase">
                Examinations ({kpis.totalExams})
              </p>
              {data.recentExams.length === 0 ? (
                <p className="text-muted text-xs">No examinations scheduled yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.recentExams.map((ex) => (
                    <div
                      key={ex.id}
                      className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                    >
                      <span className="text-foreground font-medium">{ex.title}</span>
                      <Badge variant="primary">{ex.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Wallet Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="text-primary h-4 w-4" aria-hidden="true" />
              Recent Wallet Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="text-muted text-sm">No wallet transactions recorded yet.</p>
            ) : (
              <div className="divide-border divide-y">
                {data.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div>
                      <p className="text-foreground font-medium">{tx.note}</p>
                      <p className="text-muted">
                        {tx.type} &bull; {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <span
                      className={
                        tx.type === "credit"
                          ? "font-semibold text-emerald-600 dark:text-emerald-400"
                          : "text-danger font-semibold"
                      }
                    >
                      {tx.type === "credit" ? "+" : "-"}
                      {formatInrFromPaise(tx.amountPaise)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificates & Audit Trail */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="text-primary h-4 w-4" aria-hidden="true" />
              Issued Certificates &amp; Live Audit Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase">
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                Certificates ({kpis.totalCertificates})
              </p>
              {data.recentCertificates.length === 0 ? (
                <p className="text-muted text-xs">No certificates issued yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.recentCertificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="border-border bg-surface flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                    >
                      <span className="text-foreground font-medium">
                        {cert.studentName} &bull; {cert.courseName}
                      </span>
                      <span className="text-muted font-mono">{cert.certificateNo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-muted mb-2 text-xs font-semibold uppercase">
                Recent Audit Trail
              </p>
              {data.recentAuditLogs.length === 0 ? (
                <p className="text-muted text-xs">No audit events recorded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.recentAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                    >
                      <span className="text-foreground font-mono">{log.action}</span>
                      <span className="text-muted">{formatDate(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
