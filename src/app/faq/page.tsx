import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { faqItems } from "@/config/landing";
import { FEATURE_PAGES } from "@/config/seo-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/components/seo/json-ld";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = buildPublicMetadata({
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about CertiDesk Pro institute registration, prepaid Razorpay wallet billing, student admissions, marksheets, and verifiable certificates.",
  path: "/faq",
  keywords: [
    "certidesk pro faq",
    "institute management software questions",
    "prepaid institute wallet faq",
  ],
});

export default function FaqPage() {
  const combinedFaqs = [...faqItems, ...FEATURE_PAGES.flatMap((f) => f.faqs).slice(0, 6)];

  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />
      <JsonLd data={buildFaqJsonLd(combinedFaqs)} />

      <Section spacing="md" background="surface">
        <Container size="md">
          <SectionHeader
            eyebrow="Help & Answers"
            title="Frequently asked questions about CertiDesk Pro"
            description="Clear, factual answers about onboarding, prepaid wallet billing, student portals, marksheets, and public certificate verification."
          />
        </Container>
      </Section>

      <Section spacing="md">
        <Container size="md" className="space-y-4">
          {combinedFaqs.map((item) => (
            <div
              key={item.question}
              className="border-border bg-background rounded-2xl border p-6"
            >
              <h2 className="text-foreground text-base font-semibold">{item.question}</h2>
              <p className="text-muted mt-2 text-sm leading-relaxed">{item.answer}</p>
            </div>
          ))}

          <div className="pt-6 text-center">
            <Link
              href="/contact"
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Still have questions? Contact us
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
