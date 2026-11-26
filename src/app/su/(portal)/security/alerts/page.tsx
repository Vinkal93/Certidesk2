import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getSecurityCenterOverview } from "@/services/security-center.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Security Alerts",
  robots: { index: false, follow: false },
};

export default async function SuSecurityAlertsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getSecurityCenterOverview(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Security Events & Webhook Rejections
        </h1>
        <p className="text-muted-foreground text-sm">
          Recorded security events and invalid-signature webhook attempts.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Security Events ({data.securityEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.securityEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No security events logged.</p>
          ) : (
            data.securityEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <Badge variant="danger">{ev.severity}</Badge>{" "}
                  <span className="ml-2">{ev.summary}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {new Date(ev.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Rejected Webhooks ({data.rejectedWebhooks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.rejectedWebhooks.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No rejected webhook signatures detected.
            </p>
          ) : (
            data.rejectedWebhooks.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs"
              >
                <span>
                  <span className="font-mono">{w.id}</span> • {w.eventType}
                </span>
                <Badge variant="danger">{w.failureReason ?? w.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
