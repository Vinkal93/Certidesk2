import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Wallet } from "lucide-react";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PricingSection } from "@/components/marketing/pricing-section";

export const metadata: Metadata = buildPublicMetadata({
  title: "Pricing & Prepaid Wallet",
  description:
    "Start CertiDesk Pro with ₹0 upfront registration. Recharge via Razorpay (₹500, ₹1,000, or ₹2,000 with ₹200 bonus) or choose an institutional plan.",
  path: "/pricing",
  keywords: [
    "institute management software pricing",
    "prepaid institute wallet",
    "student admission software pricing India",
  ],
});

const rechargeTiers = [
  {
    amount: "₹500",
    bonus: "Standard Recharge",
    description: "Ideal for testing live student admissions and verifying your workflow.",
    highlighted: false,
  },
  {
    amount: "₹1,000",
    bonus: "Popular Starter Pack",
    description: "Covers ongoing monthly student admissions for growing batches.",
    highlighted: false,
  },
  {
    amount: "₹2,000",
    bonus: "+₹200 Promotional Bonus",
    description:
      "Verified ₹2,000 Razorpay recharges automatically receive ₹200 bonus credits (₹2,200 total wallet value).",
    highlighted: true,
  },
];

export default function PricingPage() {
  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ])}
      />

      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="Transparent Billing"
            title="Start with ₹0 upfront. Recharge only when you admit students."
            description="CertiDesk Pro combines self-service institute registration with a prepaid Razorpay wallet so new and seasonal institutes never face heavy annual lock-ins."
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Register Institute Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/features/wallet"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              How the Prepaid Wallet Works
            </Link>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <div className="mb-8 flex items-center gap-2">
            <Wallet className="text-primary h-5 w-5" aria-hidden="true" />
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Prepaid Razorpay Recharge Options
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {rechargeTiers.map((tier) => (
              <Card
                key={tier.amount}
                className={
                  tier.highlighted ? "border-primary ring-primary/20 ring-1" : ""
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-3xl font-bold">{tier.amount}</CardTitle>
                    <Badge variant={tier.highlighted ? "success" : "primary"}>
                      {tier.bonus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted text-sm leading-relaxed">{tier.description}</p>
                  <ul className="space-y-1.5 text-xs">
                    <li className="text-foreground flex items-center gap-2">
                      <CheckCircle2
                        className="text-success h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      Verified Razorpay payment &amp; atomic ledger
                    </li>
                    <li className="text-foreground flex items-center gap-2">
                      <CheckCircle2
                        className="text-success h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      Zero negative balance enforcement
                    </li>
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <PricingSection />
    </PageContainer>
  );
}
