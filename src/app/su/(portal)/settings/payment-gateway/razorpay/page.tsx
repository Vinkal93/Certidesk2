import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { getSafeGatewayOverview } from "@/services/gateway.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { RazorpayGatewayControlCenter } from "@/features/super-admin/components/razorpay-gateway-control-center";

export const metadata: Metadata = {
  title: "Razorpay Gateway Control Center",
  robots: { index: false, follow: false },
};

export default async function RazorpayGatewayPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const overview = await getSafeGatewayOverview();

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 border-b pb-5">
            <Link
              href="/su/settings/payment-gateway"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Payment Gateway
            </Link>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Razorpay Control Center
            </h1>
            <p className="text-muted mt-1 text-sm">
              Manage Test and Live Secret Manager credentials, webhook verification,
              diagnostics, and activation controls.
            </p>
          </div>

          <RazorpayGatewayControlCenter initialOverview={overview} />
        </Container>
      </Section>
    </PageContainer>
  );
}
