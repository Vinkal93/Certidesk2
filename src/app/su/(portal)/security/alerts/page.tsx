import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listSecurityAlertsAndRules } from "@/services/security-center.service";
import { SecurityAlertsClient } from "@/features/super-admin/components/security-alerts-client";

export const metadata: Metadata = {
  title: "Security Alerts",
  robots: { index: false, follow: false },
};

export default async function SuSecurityAlertsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await listSecurityAlertsAndRules(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Security Alerts &amp; Detection Rules
        </h1>
        <p className="text-muted-foreground text-sm">
          Deduplicated security alerts, investigation workflow, and configurable rule
          thresholds.
        </p>
      </div>
      <SecurityAlertsClient initialAlerts={data.alerts} initialRules={data.rules} />
    </div>
  );
}
