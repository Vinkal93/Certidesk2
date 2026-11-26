import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getSecurityCenterOverview } from "@/services/security-center.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Security & Audit Report",
  robots: { index: false, follow: false },
};

export default async function SuReportsSecurityPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const sec = await getSecurityCenterOverview(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Security & Compliance Report
        </h1>
        <p className="text-muted-foreground text-sm">
          Summary of authentication audits, webhook integrity, and security events.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">
              Auth Events Audited
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sec.metrics.trackedAuthEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">
              Rejected Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sec.metrics.rejectedWebhooks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">
              Open Security Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sec.metrics.openSecurityEvents}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
