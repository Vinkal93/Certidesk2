import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listPlatformLockdowns } from "@/services/emergency-ops.service";
import { LockdownClient } from "@/features/super-admin/components/emergency/lockdown-client";

export const metadata: Metadata = {
  title: "Platform Lockdown",
  robots: { index: false, follow: false },
};

export default async function SuEmergencyLockdownPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await listPlatformLockdowns(user);

  return (
    <LockdownClient
      initialLockdowns={data.lockdowns}
      institutes={data.institutes}
      services={data.services}
    />
  );
}
