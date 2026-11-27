import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listSubscriptionsAndOverrides } from "@/services/entitlement.service";
import { FEATURE_REGISTRY, listPlanVersions } from "@/services/billing.service";
import { SubscriptionsClient } from "@/features/super-admin/components/subscriptions-client";
import { EntitlementsRegistryClient } from "@/features/super-admin/components/entitlements-registry-client";

export const metadata: Metadata = {
  title: "Feature Entitlements",
  robots: { index: false, follow: false },
};

export default async function SuEntitlementsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const [data, planVersions] = await Promise.all([
    listSubscriptionsAndOverrides(user),
    listPlanVersions(user),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Feature Registry &amp; Entitlements
        </h1>
        <p className="text-muted-foreground text-sm">
          Central feature catalogue, plan comparison matrix, and per-institute overrides
          enforced server-side.
        </p>
      </div>
      <EntitlementsRegistryClient
        features={FEATURE_REGISTRY}
        planVersions={planVersions}
      />
      <SubscriptionsClient {...data} />
    </div>
  );
}
