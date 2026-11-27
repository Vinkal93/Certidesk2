import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getEmergencyDashboardData } from "@/services/emergency-ops.service";
import { EmergencyDashboardClient } from "@/features/super-admin/components/emergency/emergency-dashboard-client";

export const metadata: Metadata = {
  title: "Emergency Dashboard",
  robots: { index: false, follow: false },
};

export default async function SuEmergencyPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getEmergencyDashboardData(user, { range: "24h" });

  return <EmergencyDashboardClient initialData={data} />;
}
