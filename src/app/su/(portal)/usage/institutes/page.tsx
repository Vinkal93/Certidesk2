import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getUsageOverview } from "@/services/metering.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Usage by Institute",
  robots: { index: false, follow: false },
};

export default async function SuUsageInstitutesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getUsageOverview(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usage by Institute</h1>
        <p className="text-muted-foreground text-sm">Period: {data.billingPeriod}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenant Consumption</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.aggregates.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No tenant usage aggregates for this period.
            </p>
          ) : (
            data.aggregates.map((agg) => (
              <div
                key={agg.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <span className="font-medium">{agg.instituteName}</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(agg.counters).map(([k, v]) => (
                    <Badge key={k} variant="outline">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
