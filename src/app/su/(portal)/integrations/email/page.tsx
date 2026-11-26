import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Email Providers",
  robots: { index: false, follow: false },
};

export default async function SuIntegrationsEmailPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const configured = Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Provider Integration</h1>
        <p className="text-sm text-muted-foreground">
          Transactional email delivery configuration status.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>SMTP / Transactional Email</span>
            <Badge variant={configured ? "default" : "outline"}>
              {configured ? "Configured" : "Not configured"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {configured
            ? "Email provider credentials are present in server environment."
            : "Not configured — no SMTP or transactional email provider credentials are configured."}
        </CardContent>
      </Card>
    </div>
  );
}
