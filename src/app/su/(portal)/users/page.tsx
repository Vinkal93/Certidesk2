import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listAllPlatformUsers } from "@/services/su-users.service";
import { AllUsersClient } from "@/features/super-admin/components/all-users-client";

export const metadata: Metadata = {
  title: "All Users & Access Control",
  robots: { index: false, follow: false },
};

export default async function SuUsersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su/login");

  const data = await listAllPlatformUsers(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          All Users &amp; Access Control
        </h1>
        <p className="text-muted mt-1 text-sm">
          Unified directory across Institute Admins, Staff, Students, and Super Admins
          with real-time login history, session revocation, blocking, and deletion.
        </p>
      </div>
      <AllUsersClient
        initialUsers={data.users}
        institutes={data.institutes}
        kpis={data.kpis}
        currentUid={user.uid}
      />
    </div>
  );
}
