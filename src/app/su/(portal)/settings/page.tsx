import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Platform Settings",
  robots: { index: false, follow: false },
};

export default async function SuperAdminSettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container size="lg">
          <div className="border-border mb-6 border-b pb-5">
            <Link
              href="/su/dashboard"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Dashboard
            </Link>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Platform Settings
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Default Pricing Model (Integer Paise)</CardTitle>
              </CardHeader>
              <CardContent className="text-muted space-y-2 text-sm">
                <p>
                  New Student Admission:{" "}
                  <span className="text-foreground font-semibold">
                    ₹150 (15000 paise)
                  </span>
                </p>
                <p>
                  Meaningful Student Profile Update:{" "}
                  <span className="text-foreground font-semibold">
                    ₹100 (10000 paise)
                  </span>
                </p>
                <p>
                  Certificate Generation:{" "}
                  <span className="text-foreground font-semibold">Included (₹0)</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Enforcement</CardTitle>
              </CardHeader>
              <CardContent className="text-muted space-y-2 text-sm">
                <p className="text-foreground flex items-center gap-2">
                  <ShieldCheck className="text-success h-4 w-4" aria-hidden="true" />
                  Firebase Admin SDK HTTP-only session verification active
                </p>
                <p>Public Super Admin registration is permanently disabled.</p>
                <p>Cross-tenant access is blocked at API and Firestore rules layers.</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="text-primary h-5 w-5" aria-hidden="true" />
                  <CardTitle>Payment Gateway Control Center</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-muted flex flex-col justify-between gap-4 text-sm sm:flex-row sm:items-center">
                <p>
                  Configure platform-wide Razorpay Test &amp; Live Secret Manager
                  credentials, webhooks, diagnostics, and payment logs.
                </p>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href="/su/settings/payment-gateway/razorpay"
                    className={buttonVariants({ variant: "primary", size: "sm" })}
                  >
                    Razorpay Settings
                  </Link>
                  <Link
                    href="/su/payments"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Payments Dashboard
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
