import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getEmergencyOverview } from "@/services/emergency.service";
import { EmergencyOpsClient } from "@/features/super-admin/components/emergency-ops-client";

export const metadata: Metadata = {
  title: "Emergency Center",
  robots: { index: false, follow: false },
};

export default async function SuEmergencyPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const overview = await getEmergencyOverview(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Emergency Operations Center</h1>
        <p className="text-sm text-muted-foreground">
          Global kill switches, maintenance mode, and audited rollback controls.
        </p>
      </div>
      <EmergencyOpsClient
        initialFlags={overview.active.flags}
        initialReason={overview.active.reason}
        {...(overview.active.expiresAt !== undefined
          ? { initialExpiresAt: overview.active.expiresAt }
          : {})}
        initialExpired={overview.active.expired}
        initialActions={overview.actions}
      />
    </div>
  );
}
