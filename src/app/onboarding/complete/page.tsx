import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Wallet } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { resolveWalletBuckets } from "@/services/wallet.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Onboarding Complete",
  robots: { index: false, follow: false },
};

export default async function OnboardingCompletePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "institute_admin") {
    redirect("/register");
  }

  const institute = await resolveAuthorizedInstitute(user);
  const wallet = resolveWalletBuckets(institute);

  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm">
          <Card elevated>
            <CardHeader className="text-center">
              <div className="bg-success-soft text-success mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="mb-1 flex justify-center">
                <Badge variant="success">Workspace Ready</Badge>
              </div>
              <CardTitle className="text-2xl">
                Welcome to CertiDesk Pro, {institute.ownerName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <div className="border-border bg-surface space-y-2 rounded-xl border p-4">
                <div className="flex justify-between">
                  <span className="text-muted">Institute Name</span>
                  <span className="font-semibold">{institute.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Institute ID</span>
                  <span className="font-mono font-semibold">{institute.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Paid Credit</span>
                  <span className="font-mono font-medium">
                    ₹{(wallet.paidBalancePaise / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Promotional Bonus</span>
                  <span className="font-mono font-medium text-emerald-700">
                    ₹{(wallet.bonusBalancePaise / 100).toFixed(2)}
                  </span>
                </div>
                <div className="border-border flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Spendable Balance</span>
                  <span className="font-mono font-bold">
                    ₹{(wallet.totalSpendableBalancePaise / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {wallet.totalSpendableBalancePaise === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                  Your wallet balance is ₹0.00. You can explore your dashboard, create
                  courses/batches, and recharge anytime when you are ready to admit
                  students.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  href="/institute/wallet/recharge"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                  Recharge Wallet
                </Link>
                <Link
                  href="/institute/dashboard"
                  className={buttonVariants({ variant: "primary" })}
                >
                  Enter Institute Dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </PageContainer>
  );
}
