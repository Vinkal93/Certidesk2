import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Security & Access",
  robots: { index: false, follow: false },
};

export default async function SuSecuritySettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const controls = [
    {
      title: "HTTP-Only Session Cookies",
      detail:
        "Firebase Admin SDK session verification with checkRevoked=true, HttpOnly, SameSite=Lax, and Secure in production.",
    },
    {
      title: "Step-Up Reauthentication (15 min window)",
      detail:
        "Required for Razorpay secret updates, live activation, manual wallet adjustments, central pricing updates, and refunds.",
    },
    {
      title: "Google Cloud Secret Manager",
      detail:
        "Razorpay Test & Live API secrets and webhook secrets are stored outside Firestore and never returned to browsers.",
    },
    {
      title: "Tenant & Portal Isolation",
      detail:
        "Wrong-portal logins are rejected with 403/423 and never silently redirected; suspended institutes have refresh tokens revoked.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Security &amp; Access Control
        </h2>
        <p className="text-muted text-sm">
          Active platform authentication, session, and tenant-isolation policies.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {controls.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Lock className="text-primary h-4 w-4" aria-hidden="true" />
                <CardTitle className="text-base">{c.title}</CardTitle>
              </div>
              <Badge variant="success">Enforced</Badge>
            </CardHeader>
            <CardContent className="text-muted text-sm">{c.detail}</CardContent>
          </Card>
        ))}
      </div>

      <div className="border-border bg-background text-muted flex items-center gap-3 rounded-xl border p-4 text-sm">
        <ShieldCheck className="text-success h-5 w-5" aria-hidden="true" />
        <span>
          Super Admin public registration is disabled. Only pre-provisioned or{" "}
          <code className="text-foreground font-mono text-xs">SUPER_ADMIN_EMAILS</code>{" "}
          allowlisted Firebase Console owners can access{" "}
          <code className="text-foreground font-mono text-xs">/su</code>.
        </span>
      </div>
    </div>
  );
}
