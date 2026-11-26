import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listSubscriptionsAndOverrides } from "@/services/entitlement.service";
import { getUsageOverview } from "@/services/metering.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Quotas & Limits",
  robots: { index: false, follow: false },
};

export default async function SuUsageQuotasPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const [usage, subs] = await Promise.all([
    getUsageOverview(user),
    listSubscriptionsAndOverrides(user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quotas & Plan Limits</h1>
        <p className="text-sm text-muted-foreground">
          Configured plan limits and per-institute overrides for {usage.billingPeriod}.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Quota Catalog ({subs.plans.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {subs.plans.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <span className="font-medium">{p.name}</span>
              <div className="flex gap-2">
                <Badge variant="outline">Students: {p.maxStudents}</Badge>
                <Badge variant="outline">Staff: {p.maxStaff}</Badge>
                <Badge variant="outline">Storage: {p.storageLimitMb} MB</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
