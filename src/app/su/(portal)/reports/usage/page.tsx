import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getUsageReportData } from "@/services/reports.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomReportBuilder } from "@/features/super-admin/components/custom-report-builder";

export const metadata: Metadata = {
  title: "Usage Reports",
  robots: { index: false, follow: false },
};

export default async function SuReportsUsagePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getUsageReportData(user);

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight">
          Platform Usage &amp; Quota Analytics
        </h1>
        <p className="text-muted-foreground mt-1 text-xs">
          Billing Period: {data.billingPeriod} · Freshness:{" "}
          <span className="font-mono">{data.freshnessAt.slice(0, 19)} UTC</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Institutes</p>
            <p className="mt-1 font-mono text-xl font-bold">{data.totals.institutes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Students</p>
            <p className="mt-1 font-mono text-xl font-bold">{data.totals.students}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Staff</p>
            <p className="mt-1 font-mono text-xl font-bold">{data.totals.staff}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Courses</p>
            <p className="mt-1 font-mono text-xl font-bold">{data.totals.courses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Certificates</p>
            <p className="mt-1 font-mono text-xl font-bold">{data.totals.certificates}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Marksheets</p>
            <p className="mt-1 font-mono text-xl font-bold">{data.totals.marksheets}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            External Provider Telemetry (Honest Availability)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between rounded-lg border p-3">
            <span>Firestore Billing Reads/Writes</span>
            <Badge variant="outline">
              {data.externalTelemetryStatus.firestoreBillingReadsWrites}
            </Badge>
          </div>
          <div className="flex justify-between rounded-lg border p-3">
            <span>API Latency Telemetry</span>
            <Badge variant="outline">
              {data.externalTelemetryStatus.apiLatencyMetrics}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Institute Resource Footprint ({data.instituteUsageRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.instituteUsageRows.length === 0 ? (
            <p className="text-muted p-6 text-center text-sm">
              No institute usage records yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border bg-surface text-muted border-b">
                  <tr>
                    <th className="px-4 py-2.5">Institute</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Students</th>
                    <th className="px-4 py-2.5">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {data.instituteUsageRows.slice(0, 30).map((row) => (
                    <tr key={row.instituteId}>
                      <td className="px-4 py-2.5 font-medium">
                        {row.instituteName}{" "}
                        <span className="text-muted font-mono">({row.code})</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={row.status === "active" ? "success" : "danger"}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono">{row.studentsCount}</td>
                      <td className="px-4 py-2.5 font-mono">{row.staffCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomReportBuilder defaultCategory="usage" defaultDataset="institutes" />
    </div>
  );
}
