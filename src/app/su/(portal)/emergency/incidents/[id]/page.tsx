import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getEnterpriseIncidentDetail } from "@/services/emergency-ops.service";
import { IncidentDetailClient } from "@/features/super-admin/components/emergency/incident-detail-client";

export const metadata: Metadata = {
  title: "Incident Detail",
  robots: { index: false, follow: false },
};

export default async function SuEmergencyIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const { id } = await params;
  let detail;
  try {
    detail = await getEnterpriseIncidentDetail(user, id);
  } catch {
    notFound();
  }

  return (
    <IncidentDetailClient
      initialIncident={detail.incident}
      initialComments={detail.comments}
      allIncidents={detail.allIncidents}
      operators={detail.operators}
    />
  );
}
