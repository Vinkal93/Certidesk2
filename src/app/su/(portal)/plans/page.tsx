import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listSubscriptionPlans } from "@/services/su-platform.service";
import { FEATURE_REGISTRY, listPlanVersions } from "@/services/billing.service";
import { PlansClient } from "@/features/super-admin/components/plans-client";
import { PlanVersionsClient } from "@/features/super-admin/components/plan-versions-client";

export const metadata: Metadata = {
  title: "Plan Management",
  robots: { index: false, follow: false },
};

export default async function SuPlansPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const [plans, versions] = await Promise.all([
    listSubscriptionPlans(user),
    listPlanVersions(user),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Plan Management &amp; Versioning
        </h1>
        <p className="text-muted text-sm">
          Define versioned plans with student, staff, storage (bytes), certificate,
          marksheet, and API allowances. Published versions preserve historical contracts.
        </p>
      </div>
      <PlanVersionsClient
        initialVersions={versions}
        featureKeys={FEATURE_REGISTRY.map((f) => ({ key: f.key, label: f.label }))}
      />
      <PlansClient initialPlans={plans} />
    </div>
  );
}
