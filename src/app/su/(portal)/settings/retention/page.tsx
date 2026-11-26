import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Data Retention",
  robots: { index: false, follow: false },
};

export default async function SuSettingsRetentionPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Data Retention & Immutability Policy
        </h1>
        <p className="text-muted-foreground text-sm">
          Server-enforced retention rules for financial, audit, and usage ledgers.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">audit_logs & securityEvents</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-xs">
            <Badge>Immutable (Append-Only)</Badge>
            <p>Client writes and deletes are blocked in firestore.rules.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              wallet_transactions & payment_orders
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-xs">
            <Badge>Immutable Financial Ledger</Badge>
            <p>Retained indefinitely for accounting reconciliation.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">usageEvents & usageAggregates</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-xs">
            <Badge>Monthly Period Partitioned</Badge>
            <p>Historical YYYY-MM aggregates are never overwritten on period rollover.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
