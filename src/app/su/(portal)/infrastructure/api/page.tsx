import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "API & Functions",
  robots: { index: false, follow: false },
};

export default async function SuInfraApiPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const apmConfigured = Boolean(process.env.GCP_CLOUD_MONITORING_ENABLED);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API & Serverless Functions</h1>
        <p className="text-muted-foreground text-sm">
          External APM and p95 latency telemetry status.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Cloud Monitoring / APM Telemetry</span>
            <Badge variant="outline">
              {apmConfigured ? "Connected" : "Monitoring disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {apmConfigured
            ? "Cloud Monitoring sink connected."
            : "Monitoring disconnected — no external APM or request-latency sink is configured. CertiDesk does not fabricate uptime or p95 latency metrics."}
        </CardContent>
      </Card>
    </div>
  );
}
