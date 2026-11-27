import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listRechargePlans } from "@/services/recharge-catalog.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { RechargePlansClient } from "@/features/super-admin/components/recharge-plans-client";

export const metadata: Metadata = {
  title: "Recharge & Promotions",
  robots: { index: false, follow: false },
};

export default async function SuperAdminRechargePlansPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const plans = await listRechargePlans(true);

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 border-b pb-5">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              Recharge Configuration &amp; Promotions
            </h1>
            <p className="text-muted mt-1 text-sm">
              Manage prepaid recharge packs, promotional bonus credits, and expiry
              policies. All amounts are stored in integer paise.
            </p>
          </div>
          <RechargePlansClient initialPlans={plans} />
        </Container>
      </Section>
    </PageContainer>
  );
}
