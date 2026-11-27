import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { listRechargePlans } from "@/services/recharge-catalog.service";
import {
  computeInstituteWalletTotals,
  listInstituteWalletTransactions,
  resolveWalletBuckets,
} from "@/services/wallet.service";
import { listInstitutePaymentOrders } from "@/services/payment.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { WalletClient } from "@/features/wallet/components/wallet-client";
import { OnboardingActionButton } from "@/features/onboarding/components/onboarding-actions";

export const metadata: Metadata = {
  title: "Onboarding Wallet Recharge",
  robots: { index: false, follow: false },
};

export default async function OnboardingWalletPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "institute_admin") {
    redirect("/register");
  }

  const [institute, plans, transactions, orders] = await Promise.all([
    resolveAuthorizedInstitute(user),
    listRechargePlans(false),
    listInstituteWalletTransactions(user.instituteId!, 20),
    listInstitutePaymentOrders(user.instituteId!, 10),
  ]);

  const wallet = resolveWalletBuckets(institute);
  const totals = computeInstituteWalletTotals(transactions);

  return (
    <PageContainer>
      <Section spacing="md" background="surface">
        <Container>
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
            <div>
              <Badge variant="primary">Onboarding · Step 3 of 4</Badge>
              <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
                Recharge Your Prepaid Wallet
              </h1>
              <p className="text-muted mt-1 text-sm">
                Add credits now to start admitting students immediately, or skip for later
                and recharge anytime from your dashboard.
              </p>
            </div>
            <OnboardingActionButton
              action="skip_wallet"
              nextHref="/onboarding/complete"
              label="Skip for Later"
              variant="outline"
              icon="skip"
            />
          </div>

          <WalletClient
            instituteName={institute.name}
            initialWallet={wallet}
            initialTotals={totals}
            initialTransactions={transactions}
            initialOrders={orders}
            rechargePlans={plans}
            admissionFeePaise={institute.pricing.admissionFeePaise}
            canRecharge={true}
            redirectAfterRecharge="/onboarding/complete"
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
