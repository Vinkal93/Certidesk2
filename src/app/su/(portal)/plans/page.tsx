import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listSubscriptionPlans } from "@/services/su-platform.service";
import { PlansClient } from "@/features/super-admin/components/plans-client";

export const metadata: Metadata = {
  title: "Plans & Subscriptions",
  robots: { index: false, follow: false },
};

export default async function SuPlansPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const plans = await listSubscriptionPlans(user);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Plans &amp; Feature Limits
        </h2>
        <p className="text-muted text-sm">
          Define institute capacity tiers and storage limits without imposing unapproved
          recurring charges.
        </p>
      </div>
      <PlansClient initialPlans={plans} />
    </div>
  );
}
