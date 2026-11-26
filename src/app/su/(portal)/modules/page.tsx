import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listFeatureFlags } from "@/services/feature-flags.service";
import { FeatureFlagsClient } from "@/features/super-admin/components/feature-flags-client";

export const metadata: Metadata = {
  title: "Module Controls",
  robots: { index: false, follow: false },
};

export default async function SuModulesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const flags = await listFeatureFlags(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Module Controls</h1>
        <p className="text-muted-foreground text-sm">
          Enable or disable product modules and emergency kill switches across tenants.
        </p>
      </div>
      <FeatureFlagsClient initialFlags={flags} />
    </div>
  );
}
