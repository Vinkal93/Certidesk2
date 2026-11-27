import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getCentralPricingConfig } from "@/services/su-platform.service";
import { listPricingRules } from "@/services/billing.service";
import { PricingClient } from "@/features/super-admin/components/pricing-client";
import { PricingRulesClient } from "@/features/super-admin/components/pricing-rules-client";

export const metadata: Metadata = {
  title: "Pricing & Charges",
  robots: { index: false, follow: false },
};

export default async function SuPricingPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const [data, rules] = await Promise.all([
    getCentralPricingConfig(user),
    listPricingRules(user),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Pricing &amp; Charges
        </h1>
        <p className="text-muted text-sm">
          Centralized effective pricing engine (integer paise). Supports global defaults,
          plan rules, and institute-specific overrides while preserving historical
          transactions.
        </p>
      </div>
      <PricingClient initialCurrent={data.current} initialHistory={data.history} />
      <PricingRulesClient initialRules={rules} />
    </div>
  );
}
