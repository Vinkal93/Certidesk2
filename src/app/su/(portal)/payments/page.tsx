import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { listPlatformPayments } from "@/services/payment.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buttonVariants } from "@/components/ui/button";
import { PaymentsDashboardClient } from "@/features/super-admin/components/payments-dashboard-client";

export const metadata: Metadata = {
  title: "Platform Payments",
  robots: { index: false, follow: false },
};

export default async function SuperAdminPaymentsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const data = await listPlatformPayments();

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-center">
            <div>
              <Link
                href="/su/dashboard"
                className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to Dashboard
              </Link>
              <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
                Platform Payments Dashboard
              </h1>
            </div>
            <Link
              href="/su/settings/payment-gateway/razorpay"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Gateway Control Center
            </Link>
          </div>

          <PaymentsDashboardClient initialItems={data.items} initialStats={data.stats} />
        </Container>
      </Section>
    </PageContainer>
  );
}
