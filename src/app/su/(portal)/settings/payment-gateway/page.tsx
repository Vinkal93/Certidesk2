import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CreditCard } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { getSafeGatewayOverview } from "@/services/gateway.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Payment Gateway Settings",
  robots: { index: false, follow: false },
};

export default async function PaymentGatewayHubPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const overview = await getSafeGatewayOverview();

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container size="lg">
          <div className="border-border mb-6 flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-center">
            <div>
              <Link
                href="/su/settings"
                className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to Platform Settings
              </Link>
              <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
                Payment Gateway Control Center
              </h1>
              <p className="text-muted mt-1 text-sm">
                Central merchant configuration used by all institutes for wallet
                recharges.
              </p>
            </div>
            <Link
              href="/su/payments"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View Payment Logs
            </Link>
          </div>

          <Card>
            <CardHeader className="border-border flex flex-row items-center justify-between border-b">
              <div className="flex items-center gap-3">
                <div className="bg-primary-soft text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle>Razorpay Standard Checkout</CardTitle>
                  <p className="text-muted text-xs">
                    Credentials stored in Google Cloud Secret Manager
                  </p>
                </div>
              </div>
              <Badge variant={overview.enabled ? "success" : "outline"}>
                {overview.enabled
                  ? `Active (${overview.activeEnvironment?.toUpperCase()})`
                  : "Disabled"}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col justify-between gap-4 pt-5 sm:flex-row sm:items-center">
              <div className="text-muted space-y-1 text-sm">
                <p>
                  Test Mode:{" "}
                  <span className="text-foreground font-medium">
                    {overview.testStatus}
                  </span>
                </p>
                <p>
                  Live Mode:{" "}
                  <span className="text-foreground font-medium">
                    {overview.liveStatus}
                  </span>
                </p>
              </div>
              <Link
                href="/su/settings/payment-gateway/razorpay"
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                Open Razorpay Control Center
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </PageContainer>
  );
}
