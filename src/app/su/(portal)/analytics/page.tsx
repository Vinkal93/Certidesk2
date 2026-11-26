import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getEnterpriseAnalytics } from "@/services/enterprise-analytics.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Enterprise Analytics",
  robots: { index: false, follow: false },
};

export default async function SuAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const { range: rawRange } = await searchParams;
  const range: "7d" | "30d" | "90d" | "all" =
    rawRange === "7d" || rawRange === "30d" || rawRange === "90d" || rawRange === "all"
      ? rawRange
      : "30d";

  const data = await getEnterpriseAnalytics(user, range);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Enterprise Platform Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Live Firestore & Razorpay metrics • Range: {data.range}
          </p>
        </div>
        <Badge variant="outline">
          Refreshed {new Date(data.generatedAt).toLocaleTimeString()}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Verified Payment Collections (LIVE)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {(data.summary.verifiedPaymentCollectionsPaise / 100).toLocaleString(
                "en-IN"
              )}
            </div>
            <p className="text-muted-foreground text-xs">Captured LIVE Razorpay orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Unspent Wallet Liability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(data.summary.walletLiabilityPaise / 100).toLocaleString("en-IN")}
            </div>
            <p className="text-muted-foreground text-xs">
              Institute wallet balances owed by platform
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Platform-Recognized Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(data.summary.recognizedRevenuePaise / 100).toLocaleString("en-IN")}
            </div>
            <p className="text-muted-foreground text-xs">
              Consumed wallet debit transactions in window
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data.definitions.map((def) => (
          <Card key={def.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">{def.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{def.value}</div>
              <p className="text-muted-foreground text-xs">
                {def.definition} ({def.source} • {def.timeWindow})
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
