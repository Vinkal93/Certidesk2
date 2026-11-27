import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import {
  getSecurityCenterOverview,
  listSecuritySessions,
} from "@/services/security-center.service";
import { SecuritySessionsClient } from "@/features/super-admin/components/security-sessions-client";

export const metadata: Metadata = {
  title: "Session Management",
  robots: { index: false, follow: false },
};

export default async function SuSecuritySessionsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const [data, sessions] = await Promise.all([
    getSecurityCenterOverview(user),
    listSecuritySessions(user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Session Management &amp; Token Revocation
        </h1>
        <p className="text-muted-foreground text-sm">
          Server-enforced session inventory, lifetime policies, and immediate token
          revocation.
        </p>
      </div>
      <SecuritySessionsClient
        users={data.manageableUsers}
        initialSessions={sessions}
        initialPolicy={data.policy}
        currentUid={user.uid}
      />
    </div>
  );
}
