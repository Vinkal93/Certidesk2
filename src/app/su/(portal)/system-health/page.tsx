import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { getSystemHealthReport } from "@/services/su-platform.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "System Health",
  robots: { index: false, follow: false },
};

export default async function SuSystemHealthPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const health = await getSystemHealthReport(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            System Health &amp; Diagnostics
          </h2>
          <p className="text-muted text-sm">
            Live connectivity checks executed at{" "}
            <span className="font-mono text-xs">{health.checkedAt}</span>
          </p>
        </div>
        <Activity className="text-primary h-5 w-5" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Firebase Authentication</CardTitle>
            {health.firebaseAuth.healthy ? (
              <CheckCircle2 className="text-success h-5 w-5" aria-hidden="true" />
            ) : (
              <XCircle className="text-danger h-5 w-5" aria-hidden="true" />
            )}
          </CardHeader>
          <CardContent className="text-muted text-xs">
            Status:{" "}
            <span className="text-foreground font-semibold">
              {health.firebaseAuth.healthy ? "Operational" : "Unavailable"}
            </span>{" "}
            &bull; Latency: {health.firebaseAuth.latencyMs}ms
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Cloud Firestore</CardTitle>
            {health.firestore.healthy ? (
              <CheckCircle2 className="text-success h-5 w-5" aria-hidden="true" />
            ) : (
              <XCircle className="text-danger h-5 w-5" aria-hidden="true" />
            )}
          </CardHeader>
          <CardContent className="text-muted text-xs">
            Status:{" "}
            <span className="text-foreground font-semibold">
              {health.firestore.healthy ? "Operational" : "Unavailable"}
            </span>{" "}
            &bull; Latency: {health.firestore.latencyMs}ms
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Razorpay Gateway</CardTitle>
            <Badge variant={health.razorpay.enabled ? "success" : "outline"}>
              {health.razorpay.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardHeader>
          <CardContent className="text-muted text-xs">
            Test: {health.razorpay.testStatus} &bull; Live: {health.razorpay.liveStatus}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Failed Webhook Events</CardTitle>
        </CardHeader>
        <CardContent>
          {health.failedWebhooks.length === 0 ? (
            <p className="text-muted text-sm">No failed webhook events recorded.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {health.failedWebhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="bg-danger-soft text-danger flex items-center justify-between rounded-lg border border-red-200 p-3"
                >
                  <span className="font-mono">
                    [{wh.environment}] {wh.eventType} ({wh.orderId ?? "—"})
                  </span>
                  <span>{wh.failureReason ?? "Failed"}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
