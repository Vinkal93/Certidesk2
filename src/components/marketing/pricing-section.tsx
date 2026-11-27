"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { pricingTiers } from "@/config/landing";
import { cn } from "@/lib/cn";
import { SectionHeader } from "@/components/layout/section-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

import type { SubscriptionPlanRecord } from "@/services/su-platform.service";

export function PricingSection({ plans }: { plans?: SubscriptionPlanRecord[] }) {
  const [annualBilling, setAnnualBilling] = React.useState(true);

  const displayTiers = React.useMemo(() => {
    if (plans && plans.length > 0) {
      return plans.map((plan, idx) => ({
        name: plan.name,
        description: plan.description,
        monthlyPrice: `₹${plan.monthlyDisplayRupees.toLocaleString("en-IN")}`,
        annualPrice: `₹${plan.yearlyDisplayRupees.toLocaleString("en-IN")}`,
        priceSuffix: annualBilling ? "/ year" : "/ month",
        highlighted: plans.length >= 3 ? idx === 1 : idx === 0,
        badge: idx === 1 ? "Popular" : undefined,
        ctaLabel: "Register Institute",
        ctaHref: "/register",
        features: [
          `Up to ${plan.maxStudents.toLocaleString("en-IN")} active students`,
          `Up to ${plan.maxStaff.toLocaleString("en-IN")} staff accounts`,
          `${plan.storageLimitMb >= 1024 ? `${(plan.storageLimitMb / 1024).toFixed(1)} GB` : `${plan.storageLimitMb} MB`} document storage`,
          "QR-verifiable certificates & marksheets",
          "Dedicated Institute & Student portals",
        ],
      }));
    }
    return pricingTiers;
  }, [plans, annualBilling]);

  return (
    <Section id="pricing" spacing="md" background="surface">
      <Container>
        <SectionHeader
          eyebrow="Pricing"
          title="Predictable plans that grow with your institute"
          description="Choose a plan aligned with your active student capacity and branch structure."
        />

        <div className="mt-8 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-sm font-medium",
              !annualBilling ? "text-foreground" : "text-muted"
            )}
          >
            Monthly
          </span>
          <Switch
            checked={annualBilling}
            onCheckedChange={setAnnualBilling}
            aria-label="Toggle annual billing discount"
          />
          <span
            className={cn(
              "text-sm font-medium",
              annualBilling ? "text-foreground" : "text-muted"
            )}
          >
            Annual
          </span>
          <Badge variant="success">Save ~16%</Badge>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {displayTiers.map((tier) => {
            const price = annualBilling ? tier.annualPrice : tier.monthlyPrice;
            return (
              <div
                key={tier.name}
                className={cn(
                  "bg-background flex flex-col justify-between rounded-2xl border p-7",
                  tier.highlighted
                    ? "border-primary ring-primary/20 shadow-lg ring-1"
                    : "border-border shadow-xs"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-foreground text-xl font-bold">{tier.name}</h3>
                    {tier.badge && <Badge variant="primary">{tier.badge}</Badge>}
                  </div>
                  <p className="text-muted mt-2 text-sm">{tier.description}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-foreground text-4xl font-bold tracking-tight">
                      {price}
                    </span>
                    <span className="text-muted text-sm">{tier.priceSuffix}</span>
                  </div>
                  <p className="text-muted mt-1 text-xs">
                    {annualBilling ? "Billed annually" : "Billed monthly"}
                  </p>

                  <ul className="border-border mt-6 space-y-3 border-t pt-6">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="text-foreground flex items-start gap-2.5 text-sm"
                      >
                        <Check
                          className="text-primary mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    href={tier.ctaHref}
                    className={buttonVariants({
                      variant: tier.highlighted ? "primary" : "outline",
                      size: "lg",
                      fullWidth: true,
                    })}
                  >
                    {tier.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
