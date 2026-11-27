import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listServiceRestrictions } from "@/services/emergency-ops.service";
import { RestrictionsClient } from "@/features/super-admin/components/emergency/restrictions-client";

export const metadata: Metadata = {
  title: "Service Restrictions",
  robots: { index: false, follow: false },
};

export default async function SuEmergencyRestrictionsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await listServiceRestrictions(user);

  return (
    <RestrictionsClient
      initialServices={data.services}
      initialRestrictions={data.restrictions}
      institutes={data.institutes}
    />
  );
}
