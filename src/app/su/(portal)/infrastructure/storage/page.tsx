import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getUsageOverview } from "@/services/metering.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Storage & Files",
  robots: { index: false, follow: false },
};

export default async function SuInfraStoragePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const usage = await getUsageOverview(user);
  const totalBytes = usage.aggregates.reduce(
    (sum, a) => sum + (a.counters.storage_bytes ?? 0),
    0
  );
  const bucketConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Storage & Media Assets</h1>
        <p className="text-muted-foreground text-sm">
          Metered storage usage from usageAggregates and bucket configuration status.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Firebase Storage Bucket</span>
              <Badge variant={bucketConfigured ? "default" : "outline"}>
                {bucketConfigured ? "Configured" : "Not configured"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            {bucketConfigured
              ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
              : "Not configured"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Metered Storage ({usage.billingPeriod})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalBytes > 0
                ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
                : "Insufficient data"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
