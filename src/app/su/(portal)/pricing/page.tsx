import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getCentralPricingConfig } from "@/services/su-platform.service";
import { PricingClient } from "@/features/super-admin/components/pricing-client";

export const metadata: Metadata = {
  title: "Pricing & Charges",
  robots: { index: false, follow: false },
};

export default async function SuPricingPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const data = await getCentralPricingConfig(user);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Central Pricing &amp; Charges
        </h2>
        <p className="text-muted text-sm">
          Configure platform-wide admission, profile update, and certificate pricing.
        </p>
      </div>
      <PricingClient initialCurrent={data.current} initialHistory={data.history} />
    </div>
  );
}
