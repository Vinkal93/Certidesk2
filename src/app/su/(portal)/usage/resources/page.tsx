import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getUsageOverview } from "@/services/metering.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Resource Breakdown",
  robots: { index: false, follow: false },
};

export default async function SuUsageResourcesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getUsageOverview(user);
  const totals = new Map<string, number>();
  for (const agg of data.aggregates) {
    for (const [k, v] of Object.entries(agg.counters)) {
      totals.set(k, (totals.get(k) ?? 0) + (v ?? 0));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resource Breakdown</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated resource consumption for {data.billingPeriod}.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {totals.size === 0 ? (
          <Card className="md:col-span-3">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Insufficient data — no metered resource events recorded for {data.billingPeriod}.
            </CardContent>
          </Card>
        ) : (
          Array.from(totals.entries()).map(([metric, total]) => (
            <Card key={metric}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">{metric}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{total.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
