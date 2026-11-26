import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getEnterpriseAnalytics } from "@/services/enterprise-analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Business Report",
  robots: { index: false, follow: false },
};

export default async function SuReportsBusinessPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getEnterpriseAnalytics(user, "30d");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Business & Tenant Growth Report</h1>
        <p className="text-sm text-muted-foreground">Range: {data.range}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Institutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalInstitutes}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.suspendedInstitutes} suspended
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Institutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.activeInstitutes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Live Payment Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.paymentSuccessRate !== null
                ? `${data.summary.paymentSuccessRate}%`
                : "Insufficient data"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
