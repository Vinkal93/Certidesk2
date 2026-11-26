import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listSubscriptionsAndOverrides } from "@/services/entitlement.service";
import { SubscriptionsClient } from "@/features/super-admin/components/subscriptions-client";

export const metadata: Metadata = {
  title: "Entitlement Overrides",
  robots: { index: false, follow: false },
};

export default async function SuEntitlementsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await listSubscriptionsAndOverrides(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature & Quota Entitlements</h1>
        <p className="text-sm text-muted-foreground">
          Manage per-institute entitlement overrides with mandatory audit reasons.
        </p>
      </div>
      <SubscriptionsClient {...data} />
    </div>
  );
}
