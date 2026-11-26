import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getRazorpayGatewayConfig } from "@/services/gateway.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Integration Status",
  robots: { index: false, follow: false },
};

export default async function SuInfraIntegrationsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const razorpay = await getRazorpayGatewayConfig();
  const smtpConfigured = Boolean(process.env.SMTP_HOST);
  const whatsappConfigured = Boolean(process.env.WHATSAPP_API_TOKEN);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">External Integration Status</h1>
        <p className="text-sm text-muted-foreground">
          Real configuration status for payment, email, and messaging providers.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Razorpay Payment Gateway</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={razorpay.enabled ? "success" : "outline"}>
              {razorpay.enabled
                ? `Configured (${razorpay.activeEnvironment ?? "unselected"})`
                : "Disabled"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Transactional Email (SMTP)</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {smtpConfigured ? "Configured" : "Not configured"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">SMS / WhatsApp Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {whatsappConfigured ? "Configured" : "Not configured"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
