import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listEnterpriseIncidents } from "@/services/emergency-ops.service";
import { IncidentsEnterpriseClient } from "@/features/super-admin/components/emergency/incidents-enterprise-client";

export const metadata: Metadata = {
  title: "Incident Management",
  robots: { index: false, follow: false },
};

export default async function SuEmergencyIncidentsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await listEnterpriseIncidents(user);

  return (
    <IncidentsEnterpriseClient
      initialIncidents={data.incidents}
      services={data.services}
      institutes={data.institutes}
      operators={data.operators}
    />
  );
}
