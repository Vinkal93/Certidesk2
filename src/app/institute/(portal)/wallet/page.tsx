import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { listInstituteWalletTransactions } from "@/services/wallet.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { WalletClient } from "@/features/wallet/components/wallet-client";

export const metadata: Metadata = {
  title: "Institute Wallet",
  robots: { index: false, follow: false },
};

export default async function InstituteWalletPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }

  if (!hasStaffPermission(user, "wallet:read")) {
    redirect("/institute/dashboard");
  }

  const institute = await resolveAuthorizedInstitute(user);
  const transactions = await listInstituteWalletTransactions(institute.id);

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 border-b pb-5">
            <Link
              href="/institute/dashboard"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Dashboard
            </Link>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Wallet &amp; Razorpay Billing
            </h1>
          </div>

          <WalletClient
            instituteName={institute.name}
            initialBalancePaise={institute.walletBalancePaise}
            initialTransactions={transactions}
            canRecharge={user.role === "institute_admin"}
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
