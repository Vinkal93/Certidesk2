import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listSubscriptionsAndOverrides } from "@/services/entitlement.service";
import { getUsageOverview } from "@/services/metering.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Quota Alerts",
  robots: { index: false, follow: false },
};

export default async function SuUsageAlertsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const [usage, subs] = await Promise.all([
    getUsageOverview(user),
    listSubscriptionsAndOverrides(user),
  ]);

  const subByInst = new Map(subs.subscriptions.map((s) => [s.instituteId, s]));
  const alerts: {
    instituteName: string;
    metric: string;
    used: number;
    limit: number;
    pct: number;
  }[] = [];

  for (const agg of usage.aggregates) {
    const sub = subByInst.get(agg.instituteId);
    if (!sub) continue;
    const students = agg.counters.students ?? 0;
    if (sub.limitsSnapshot.maxStudents > 0) {
      const pct = Math.round((students / sub.limitsSnapshot.maxStudents) * 100);
      if (pct >= 70) {
        alerts.push({
          instituteName: agg.instituteName,
          metric: "students",
          used: students,
          limit: sub.limitsSnapshot.maxStudents,
          pct,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quota Threshold Alerts</h1>
        <p className="text-muted-foreground text-sm">
          Tenants exceeding 70%, 85%, 95%, or 100% of contracted limits.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Active Threshold Alerts ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No institutes have crossed the 70% quota warning threshold in{" "}
              {usage.billingPeriod}.
            </p>
          ) : (
            alerts.map((a, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <span>
                  {a.instituteName} • {a.metric} ({a.used}/{a.limit})
                </span>
                <Badge variant={a.pct >= 95 ? "danger" : "warning"}>{a.pct}%</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
