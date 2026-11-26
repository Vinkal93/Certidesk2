import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getEmergencyOverview } from "@/services/emergency.service";
import { IncidentsClient } from "@/features/super-admin/components/incidents-client";

export const metadata: Metadata = {
  title: "Incident Management",
  robots: { index: false, follow: false },
};

export default async function SuEmergencyIncidentsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const overview = await getEmergencyOverview(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Incident Management</h1>
        <p className="text-sm text-muted-foreground">
          Declare, track, and resolve SEV-1 through SEV-4 platform incidents.
        </p>
      </div>
      <IncidentsClient initialIncidents={overview.incidents} />
    </div>
  );
}
