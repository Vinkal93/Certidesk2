import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { getSecurityReportData } from "@/services/reports.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomReportBuilder } from "@/features/super-admin/components/custom-report-builder";

export const metadata: Metadata = {
  title: "Security Reports",
  robots: { index: false, follow: false },
};

export default async function SuReportsSecurityPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getSecurityReportData(user, "30d");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Security &amp; Compliance Reports
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Window: {data.range} · All exports redact passwords, cookies, OTPs &amp;
            secrets · Freshness:{" "}
            <span className="font-mono">{data.freshnessAt.slice(0, 19)} UTC</span>
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/su/reports/export?dataset=security_login_events&range=30d&format=csv"
            download
            className="border-border bg-background hover:bg-surface inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export Auth CSV
          </a>
          <a
            href="/api/su/reports/export?dataset=audit_logs&range=30d&format=csv"
            download
            className="border-border bg-background hover:bg-surface inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export Audit CSV
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Auth Events (Success / Fail / Blocked)</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {data.authentication.success} / {data.authentication.failed} /{" "}
              {data.authentication.blocked}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Sessions (Active / Revoked / Expired)</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {data.sessions.active} / {data.sessions.revoked} / {data.sessions.expired}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Governance Events</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {data.governance.permissionOverrides + data.governance.sessionRevocations}
            </p>
            <p className="text-muted mt-1 text-xs">
              {data.governance.permissionOverrides} overrides ·{" "}
              {data.governance.sessionRevocations} revocations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Incidents (Open / Resolved)</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {data.incidents.open} / {data.incidents.resolved}
            </p>
            <p className="text-muted mt-1 text-xs">
              MTTR:{" "}
              {data.incidents.mttrMinutes !== null
                ? `${data.incidents.mttrMinutes} min`
                : "Insufficient data"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Redacted Audit Activity ({data.redactedAudits.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.redactedAudits.length === 0 ? (
            <p className="text-muted p-6 text-center text-sm">
              No audit records in this range.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {data.redactedAudits.slice(0, 15).map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs"
                >
                  <div>
                    <Badge variant="outline">{a.action}</Badge>{" "}
                    <span className="ml-2 font-mono">{a.actorUid}</span> ({a.actorRole})
                  </div>
                  <span className="text-muted font-mono">
                    {a.createdAt.slice(0, 19).replace("T", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomReportBuilder
        defaultCategory="security"
        defaultDataset="security_login_events"
      />
    </div>
  );
}
