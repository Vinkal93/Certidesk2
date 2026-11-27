import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getAdvancedUsageOverview } from "@/services/metering.service";
import { UsageOverviewClient } from "@/features/super-admin/components/usage-overview-client";

export const metadata: Metadata = {
  title: "Usage Overview",
  robots: { index: false, follow: false },
};

export default async function SuUsagePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su/login");

  const data = await getAdvancedUsageOverview(user);

  return <UsageOverviewClient {...data} />;
}
