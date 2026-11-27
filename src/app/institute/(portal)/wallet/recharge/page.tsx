import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import {
  computeInstituteWalletTotals,
  listInstituteWalletTransactions,
  resolveWalletBuckets,
} from "@/services/wallet.service";
import { listRechargePlans } from "@/services/recharge-catalog.service";
import { listInstitutePaymentOrders } from "@/services/payment.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { WalletClient } from "@/features/wallet/components/wallet-client";

export const metadata: Metadata = {
  title: "Recharge Wallet",
  robots: { index: false, follow: false },
};

export default async function InstituteWalletRechargePage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "wallet:read")) {
    redirect("/institute/dashboard");
  }

  const institute = await resolveAuthorizedInstitute(user);
  const [transactions, plans, orders] = await Promise.all([
    listInstituteWalletTransactions(institute.id, 20),
    listRechargePlans(false),
    listInstitutePaymentOrders(institute.id, 10),
  ]);

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 border-b pb-5">
            <Link
              href="/institute/wallet"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Wallet Overview
            </Link>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Recharge Prepaid Wallet
            </h1>
          </div>

          <WalletClient
            instituteName={institute.name}
            initialWallet={resolveWalletBuckets(institute)}
            initialTotals={computeInstituteWalletTotals(transactions)}
            initialTransactions={transactions}
            initialOrders={orders}
            rechargePlans={plans}
            admissionFeePaise={institute.pricing.admissionFeePaise}
            canRecharge={user.role === "institute_admin"}
            mode="recharge_only"
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
