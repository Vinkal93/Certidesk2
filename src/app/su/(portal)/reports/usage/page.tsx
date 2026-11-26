import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getUsageOverview } from "@/services/metering.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Usage Report",
  robots: { index: false, follow: false },
};

export default async function SuReportsUsagePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const usage = await getUsageOverview(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Usage Report</h1>
        <p className="text-sm text-muted-foreground">Billing Period: {usage.billingPeriod}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Metered Institutes ({usage.aggregates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {usage.aggregates.length === 0 ? (
            <p className="text-muted-foreground">Insufficient data for {usage.billingPeriod}.</p>
          ) : (
            usage.aggregates.map((a) => (
              <div key={a.id} className="rounded-lg border p-3">
                <span className="font-medium">{a.instituteName}</span>:{" "}
                <span className="text-xs text-muted-foreground">
                  {JSON.stringify(a.counters)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
