import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FEATURE_PAGES, SOLUTION_PAGES } from "@/config/seo-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = buildPublicMetadata({
  title: "Features — Institute, Student, Marksheet & Certificate Modules",
  description:
    "Explore all CertiDesk Pro modules: student management, institute ERP, certificate generator, marksheet generator, attendance, fees, batches, staff, prepaid wallet, and reports.",
  path: "/features",
  keywords: [
    "institute management software features",
    "student management software",
    "certificate generation software",
    "marksheet generator software",
  ],
});

export default function FeaturesHubPage() {
  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
        ])}
      />

      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="Platform Capabilities"
            title="Every module your educational institute needs in one place"
            description="CertiDesk Pro unifies student admissions, batch scheduling, daily attendance, fee tracking, examinations, marksheets, verifiable certificates, and prepaid wallet billing."
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Register Your Institute
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              View Prepaid Wallet &amp; Pricing
            </Link>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURE_PAGES.map((feature) => (
              <Card key={feature.slug} className="flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <p className="text-primary text-xs font-semibold tracking-wider uppercase">
                      {feature.eyebrow}
                    </p>
                    <CardTitle className="mt-1 text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted text-sm leading-relaxed">
                      {feature.metaDescription}
                    </p>
                    <ul className="space-y-1.5 text-xs">
                      {feature.benefits.slice(0, 2).map((b) => (
                        <li key={b} className="text-foreground flex items-start gap-2">
                          <CheckCircle2
                            className="text-success mt-0.5 h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </div>
                <div className="px-6 pt-2 pb-6">
                  <Link
                    href={`/features/${feature.slug}`}
                    className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                  >
                    Explore {feature.eyebrow}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="Built for Your Organization"
            title="Industry-specific solutions"
            description="See how computer institutes, coaching centres, and vocational academies configure CertiDesk Pro."
          />
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {SOLUTION_PAGES.map((sol) => (
              <Link
                key={sol.slug}
                href={`/solutions/${sol.slug}`}
                className="border-border bg-background hover:border-primary/40 rounded-2xl border p-6 transition-colors"
              >
                <p className="text-primary text-xs font-semibold uppercase">
                  {sol.eyebrow}
                </p>
                <h2 className="text-foreground mt-2 text-lg font-semibold">
                  {sol.title}
                </h2>
                <p className="text-muted mt-2 text-sm leading-relaxed">
                  {sol.metaDescription}
                </p>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
