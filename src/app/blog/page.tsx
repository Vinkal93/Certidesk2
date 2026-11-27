import type { Metadata } from "next";
import { BLOG_ARTICLES } from "@/config/seo-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { BlogIndexClient } from "@/components/blog/blog-index-client";

export const metadata: Metadata = buildPublicMetadata({
  title: "Institute Management Blog & Guides",
  description:
    "20 practical SEO guides on computer institute management, student admission workflows, marksheet formatting, QR-verifiable certificates, and prepaid SaaS billing.",
  path: "/blog",
  keywords: [
    "institute management blog",
    "computer institute operations guide",
    "certificate verification guide",
    "coaching institute software blog",
  ],
});

export default function BlogIndexPage() {
  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />

      <Section spacing="md" background="surface">
        <Container>
          <div className="max-w-3xl space-y-3">
            <p className="text-primary text-xs font-semibold tracking-wider uppercase">
              Resources &amp; Guides
            </p>
            <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
              Practical guides for modern educational and training institutes
            </h1>
            <p className="text-muted text-base leading-relaxed">
              Actionable workflows on digital admissions, attendance, online exams,
              examination marksheets, QR-verifiable certificates, and institute finance.
            </p>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <BlogIndexClient articles={BLOG_ARTICLES} />
        </Container>
      </Section>
    </PageContainer>
  );
}
