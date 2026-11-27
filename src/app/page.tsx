import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { faqItems, moduleSpotlights } from "@/config/landing";
import { BLOG_ARTICLES, FEATURE_PAGES, SOLUTION_PAGES } from "@/config/seo-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from "@/components/seo/json-ld";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { HeroSection } from "@/components/marketing/hero-section";
import { ShowcaseCardsSection } from "@/components/marketing/showcase-cards-section";
import { CredibilitySection } from "@/components/marketing/credibility-section";
import { CoreFeaturesSection } from "@/components/marketing/core-features-section";
import { WorkflowSection } from "@/components/marketing/workflow-section";
import { ModuleSpotlightSection } from "@/components/marketing/module-spotlight-section";
import { ProductPreviewSection } from "@/components/marketing/product-preview-section";
import { SolutionsSection } from "@/components/marketing/solutions-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";

export const metadata: Metadata = buildPublicMetadata({
  title: "CertiDesk Pro | Institute & Certificate Management Software",
  description:
    "Manage students, institute operations, attendance, fees, examinations, marksheets, and verifiable certificates with CertiDesk Pro's centralized institute management SaaS.",
  path: "/",
  keywords: [
    "institute management software",
    "computer institute management software",
    "student management software",
    "certificate generation software",
    "marksheet generator software",
    "coaching institute software India",
  ],
});

export default function HomePage() {
  return (
    <PageContainer>
      <JsonLd data={buildOrganizationJsonLd()} />
      <JsonLd data={buildWebSiteJsonLd()} />
      <JsonLd data={buildSoftwareApplicationJsonLd()} />
      <JsonLd data={buildFaqJsonLd(faqItems)} />

      {/* 2. Hero */}
      <HeroSection />

      {/* 2.5 Showcase Cards */}
      <ShowcaseCardsSection />

      {/* 3. Product credibility & key benefits */}
      <CredibilitySection />

      {/* 4. Core feature grid */}
      <CoreFeaturesSection />

      {/* 5. Institute management workflow */}
      <WorkflowSection />

      {/* 6-11. Student, Fee, Attendance, Examination & Marksheet, Certificate, Reports */}
      {moduleSpotlights.map((spotlight, index) => (
        <ModuleSpotlightSection
          key={spotlight.id}
          spotlight={spotlight}
          reverse={index % 2 === 1}
          background={index % 2 === 1 ? "surface" : "default"}
        />
      ))}

      {/* 12. Product interface preview */}
      <ProductPreviewSection />

      {/* 13. Solutions for different institutes */}
      <SolutionsSection />

      {/* 14. Pricing */}
      <PricingSection />

      {/* 15. FAQ */}
      <FaqSection />

      {/* 15.5 SEO Internal Linking Hub */}
      <Section spacing="md" background="surface" className="border-border border-b">
        <Container>
          <SectionHeader
            eyebrow="Explore CertiDesk Pro"
            title="Dedicated modules, institute solutions, and practical guides"
            description="Deep-dive into every operational module, prepaid wallet workflow, and educational guide."
          />

          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="border-border bg-background rounded-2xl border p-6">
              <h3 className="text-foreground text-base font-semibold">
                Platform Modules
              </h3>
              <ul className="mt-4 space-y-2 text-sm">
                {FEATURE_PAGES.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/features/${item.slug}`}
                      className="text-muted hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-border bg-background rounded-2xl border p-6">
              <h3 className="text-foreground text-base font-semibold">
                Institute Solutions &amp; Trust
              </h3>
              <ul className="mt-4 space-y-2 text-sm">
                {SOLUTION_PAGES.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/solutions/${item.slug}`}
                      className="text-muted hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/how-it-works"
                    className="text-muted hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    How CertiDesk Pro Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/security"
                    className="text-muted hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    Security &amp; Multi-Tenant Architecture
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-muted hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    Transparent Prepaid Wallet Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="text-muted hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    Frequently Asked Questions
                  </Link>
                </li>
              </ul>
            </div>

            <div className="border-border bg-background rounded-2xl border p-6">
              <h3 className="text-foreground text-base font-semibold">
                Latest Institute Guides
              </h3>
              <ul className="mt-4 space-y-2 text-sm">
                {BLOG_ARTICLES.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/blog/${article.slug}`}
                      className="text-muted hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      {/* 16. Final CTA */}
      <FinalCtaSection />
    </PageContainer>
  );
}
