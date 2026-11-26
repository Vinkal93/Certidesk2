import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listSubscriptionsAndOverrides } from "@/services/entitlement.service";
import { SubscriptionsClient } from "@/features/super-admin/components/subscriptions-client";

export const metadata: Metadata = {
  title: "Subscriptions",
  robots: { index: false, follow: false },
};

export default async function SuSubscriptionsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await listSubscriptionsAndOverrides(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Institute Subscriptions</h1>
        <p className="text-muted-foreground text-sm">
          Assign plans with immutable price & quota snapshots. Historical subscriptions
          preserve contracted rates.
        </p>
      </div>
      <SubscriptionsClient {...data} />
    </div>
  );
}
