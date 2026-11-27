import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { TOPICAL_SEO_PAGES, getTopicalSeoPage } from "@/config/topical-seo";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
} from "@/components/seo/json-ld";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOPICAL_SEO_PAGES.map((p) => ({ topic: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const page = getTopicalSeoPage(topic);
  if (!page) return {};
  return buildPublicMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/${page.slug}`,
  });
}

export default async function TopicalAuthorityPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const page = getTopicalSeoPage(topic);
  if (!page) notFound();

  return (
    <PageContainer>
      <JsonLd data={buildSoftwareApplicationJsonLd()} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: page.title, path: `/${page.slug}` },
        ])}
      />
      <JsonLd data={buildFaqJsonLd(page.faqs)} />

      <Section spacing="md" background="surface" className="border-border border-b">
        <Container>
          <nav aria-label="Breadcrumb" className="text-muted mb-4 text-xs">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>{" "}
            / <span className="text-foreground font-medium">{page.eyebrow}</span>
          </nav>

          <Badge variant="primary" className="mb-3">
            {page.eyebrow}
          </Badge>
          <h1 className="text-foreground max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {page.title}
          </h1>
          <p className="text-muted mt-4 max-w-3xl text-base leading-relaxed sm:text-lg">
            {page.problemSummary}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/register"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Register Your Institute
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/download"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Download App
            </Link>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container className="space-y-12">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {page.capabilities.map((cap) => (
              <Card key={cap.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{cap.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted text-sm leading-relaxed">{cap.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works in CertiDesk Pro</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {page.workflows.map((step, idx) => (
                  <li key={step} className="flex items-start gap-3 text-sm">
                    <span className="bg-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-foreground pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {page.faqs.map((faq) => (
                <Card key={faq.question}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-start gap-2 text-base">
                      <CheckCircle2
                        className="text-primary mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
            <div>
              <p className="text-foreground text-sm font-semibold">
                Explore Related Capabilities
              </p>
              <p className="text-muted text-xs">
                Connected modules inside the CertiDesk Pro SaaS platform
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-border bg-background text-foreground hover:border-primary/40 rounded-xl border px-3.5 py-2 text-xs font-semibold transition"
                >
                  {link.label} &rarr;
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
