import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getSecurityCenterOverview } from "@/services/security-center.service";
import { SecurityDashboardClient } from "@/features/super-admin/components/security-dashboard-client";

export const metadata: Metadata = {
  title: "Security Center",
  robots: { index: false, follow: false },
};

export default async function SuSecurityOverviewPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getSecurityCenterOverview(user);

  return <SecurityDashboardClient initialData={data} />;
}
