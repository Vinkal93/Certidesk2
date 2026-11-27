import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { getBusinessReportData } from "@/services/reports.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomReportBuilder } from "@/features/super-admin/components/custom-report-builder";

export const metadata: Metadata = {
  title: "Business Reports",
  robots: { index: false, follow: false },
};

export default async function SuReportsBusinessPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getBusinessReportData(user, "30d");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Business &amp; Tenant Growth Reports
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Window: {data.range} · Freshness:{" "}
            <span className="font-mono">{data.freshnessAt.slice(0, 19)} UTC</span>
          </p>
        </div>
        <a
          href="/api/su/reports/export?dataset=institutes&range=30d&format=csv"
          className="border-border bg-background hover:bg-surface inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export Institutes CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Total Institutes</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {data.summary.totalInstitutes}
            </p>
            <p className="text-muted mt-1 text-xs">
              {data.summary.activeInstitutes} active · {data.summary.suspendedInstitutes}{" "}
              suspended
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">New Registrations (30d)</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {data.summary.newRegistrations}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Total / Active Students</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {data.summary.totalStudents} / {data.summary.activeStudents}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Staff &amp; Certificates</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {data.summary.totalStaff} / {data.summary.totalCertificates}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Funnel & Plan Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Lifecycle Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex justify-between rounded-lg border p-3">
              <span>1. Registered Institutes</span>
              <span className="font-mono font-bold">
                {data.onboardingFunnel.registered}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span>2. Verified Contact / Onboarding</span>
              <span className="font-mono font-bold">
                {data.onboardingFunnel.verified}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span>3. Recharged Wallet at Least Once</span>
              <span className="font-mono font-bold">
                {data.onboardingFunnel.rechargedAtLeastOnce}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border p-3">
              <span>4. Admitted at Least One Student</span>
              <span className="font-mono font-bold">
                {data.onboardingFunnel.admittedAtLeastOneStudent}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Institutes by Plan &amp; Metric Definitions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex flex-wrap gap-2">
              {data.planDistribution.map((p) => (
                <Badge key={p.plan} variant="outline">
                  {p.plan}: {p.count}
                </Badge>
              ))}
            </div>
            <div className="space-y-1.5 border-t pt-3">
              {data.definitions.map((def) => (
                <div key={def.key} className="text-muted">
                  <span className="text-foreground font-semibold">{def.label}:</span>{" "}
                  {def.definition} ({def.source})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Institute Drill-Down */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Institute Lifecycle Drill-Down ({data.instituteDrilldown.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.instituteDrilldown.length === 0 ? (
            <p className="text-muted p-6 text-center text-sm">
              No institutes registered yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border bg-surface text-muted border-b">
                  <tr>
                    <th className="px-4 py-2.5">Institute</th>
                    <th className="px-4 py-2.5">Plan</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Students / Staff</th>
                    <th className="px-4 py-2.5">Wallet Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {data.instituteDrilldown.slice(0, 30).map((inst) => (
                    <tr key={inst.id}>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/su/institutes/${inst.id}`}
                          className="text-primary font-semibold hover:underline"
                        >
                          {inst.name}
                        </Link>
                        <p className="text-muted font-mono">{inst.code}</p>
                      </td>
                      <td className="px-4 py-2.5">{inst.planName}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={inst.status === "active" ? "success" : "danger"}>
                          {inst.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {inst.studentCount} / {inst.staffCount}
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        ₹{(inst.walletBalancePaise / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomReportBuilder defaultCategory="business" defaultDataset="institutes" />
    </div>
  );
}
