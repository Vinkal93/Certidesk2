import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Alert Routing",
  robots: { index: false, follow: false },
};

export default async function SuSettingsNotificationsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const emailConfigured = Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY);
  const slackConfigured = Boolean(process.env.ALERT_WEBHOOK_URL);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification & Alert Routing</h1>
        <p className="text-sm text-muted-foreground">
          External incident and quota alert delivery channels.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Email Alert Sink</span>
              <Badge variant={emailConfigured ? "default" : "outline"}>
                {emailConfigured ? "Configured" : "Not configured"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {emailConfigured ? "SMTP/Resend configured." : "Not configured"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Slack / PagerDuty Webhook</span>
              <Badge variant={slackConfigured ? "default" : "outline"}>
                {slackConfigured ? "Configured" : "Not configured"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {slackConfigured ? "ALERT_WEBHOOK_URL configured." : "Not configured"}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
