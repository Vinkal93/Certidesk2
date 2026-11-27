import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listLoginActivity } from "@/services/security-center.service";
import { SecurityLoginsClient } from "@/features/super-admin/components/security-logins-client";

export const metadata: Metadata = {
  title: "Login Activity",
  robots: { index: false, follow: false },
};

export default async function SuSecurityLoginsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const events = await listLoginActivity(user, { limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Authentication &amp; Login Activity
        </h1>
        <p className="text-muted-foreground text-sm">
          Real-time authentication event explorer from securityLoginEvents.
        </p>
      </div>
      <SecurityLoginsClient initialEvents={events} />
    </div>
  );
}
