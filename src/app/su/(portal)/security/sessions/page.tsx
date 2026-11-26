import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getSecurityCenterOverview } from "@/services/security-center.service";
import { SecuritySessionsClient } from "@/features/super-admin/components/security-sessions-client";

export const metadata: Metadata = {
  title: "Session Revocation",
  robots: { index: false, follow: false },
};

export default async function SuSecuritySessionsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getSecurityCenterOverview(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Active Sessions & Token Revocation</h1>
        <p className="text-sm text-muted-foreground">
          Immediately revoke Firebase refresh tokens for any compromised or suspended account.
        </p>
      </div>
      <SecuritySessionsClient users={data.manageableUsers} currentUid={user.uid} />
    </div>
  );
}
