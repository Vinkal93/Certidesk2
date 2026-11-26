import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "SMS & WhatsApp",
  robots: { index: false, follow: false },
};

export default async function SuIntegrationsMessagingPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const configured = Boolean(
    process.env.WHATSAPP_API_TOKEN || process.env.TWILIO_ACCOUNT_SID
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SMS & WhatsApp Providers</h1>
        <p className="text-muted-foreground text-sm">
          Messaging provider configuration status.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>WhatsApp / SMS Gateway</span>
            <Badge variant={configured ? "default" : "outline"}>
              {configured ? "Configured" : "Not configured"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {configured
            ? "Messaging provider credentials are configured."
            : "Not configured — no SMS or WhatsApp provider is connected."}
        </CardContent>
      </Card>
    </div>
  );
}
