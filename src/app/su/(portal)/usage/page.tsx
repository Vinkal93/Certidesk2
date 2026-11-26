import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getUsageOverview } from "@/services/metering.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Usage Overview",
  robots: { index: false, follow: false },
};

export default async function SuUsagePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getUsageOverview(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Usage Metering</h1>
          <p className="text-muted-foreground text-sm">
            Billing Period: {data.billingPeriod} • Idempotent event-backed aggregates
          </p>
        </div>
        <Badge variant="outline">Thresholds: {data.thresholds.join("%, ")}%</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Institute Usage Aggregates ({data.aggregates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.aggregates.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No usage events recorded for {data.billingPeriod} yet.
            </p>
          ) : (
            data.aggregates.map((agg) => (
              <div key={agg.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{agg.instituteName}</div>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-xs">
                  {Object.entries(agg.counters).map(([k, v]) => (
                    <Badge key={k} variant="primary">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Usage Events ({data.recentEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No usage events recorded.</p>
          ) : (
            data.recentEvents.slice(0, 20).map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-xs"
              >
                <span>
                  <span className="font-mono font-semibold">{ev.metricKey}</span> •{" "}
                  {ev.instituteId} ({ev.sourceOperation})
                </span>
                <span>
                  +{ev.quantity} {ev.unit}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
