import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listMaintenanceEvents } from "@/services/emergency-ops.service";
import { MaintenanceClient } from "@/features/super-admin/components/emergency/maintenance-client";

export const metadata: Metadata = {
  title: "Maintenance Mode",
  robots: { index: false, follow: false },
};

export default async function SuEmergencyMaintenancePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await listMaintenanceEvents(user);

  return (
    <MaintenanceClient
      initialEvents={data.events}
      institutes={data.institutes}
      services={data.services}
    />
  );
}
