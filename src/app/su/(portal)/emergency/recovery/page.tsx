import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getRecoveryOverview } from "@/services/emergency-ops.service";
import { RecoveryClient } from "@/features/super-admin/components/emergency/recovery-client";

export const metadata: Metadata = {
  title: "Recovery Operations",
  robots: { index: false, follow: false },
};

export default async function SuEmergencyRecoveryPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getRecoveryOverview(user);

  return <RecoveryClient initialData={data} />;
}
