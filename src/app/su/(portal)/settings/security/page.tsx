import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getAccessControlOverview } from "@/services/security-center.service";
import { SecurityAccessControlClient } from "@/features/super-admin/components/security-access-control-client";

export const metadata: Metadata = {
  title: "Security & Access Control",
  robots: { index: false, follow: false },
};

export default async function SuSecuritySettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getAccessControlOverview(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Security &amp; Access Control
        </h1>
        <p className="text-muted-foreground text-sm">
          Role directory, least-privilege permission matrix, and audited user overrides.
        </p>
      </div>
      <SecurityAccessControlClient
        roles={data.roles}
        permissions={data.permissions}
        initialOverrides={data.overrides}
        users={data.users}
      />
    </div>
  );
}
