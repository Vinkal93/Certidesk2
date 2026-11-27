import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { FEATURE_PAGES, getFeatureBySlug } from "@/config/seo-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/components/seo/json-ld";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export function generateStaticParams() {
  return FEATURE_PAGES.map((feature) => ({ slug: feature.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) {
    return buildPublicMetadata({
      title: "Feature Not Found",
      description: "Requested CertiDesk Pro feature page was not found.",
      path: `/features/${slug}`,
      noIndex: true,
    });
  }

  return buildPublicMetadata({
    title: feature.metaTitle,
    description: feature.metaDescription,
    path: `/features/${feature.slug}`,
    keywords: feature.keywords,
  });
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) notFound();

  const related = feature.relatedSlugs
    .map((s) => getFeatureBySlug(s))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
          { name: feature.title, path: `/features/${feature.slug}` },
        ])}
      />
      <JsonLd data={buildFaqJsonLd(feature.faqs)} />

      <Section spacing="md" background="surface">
        <Container>
          <nav aria-label="Breadcrumb" className="text-muted mb-6 text-xs">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/features" className="hover:text-foreground">
              Features
            </Link>{" "}
            / <span className="text-foreground font-medium">{feature.eyebrow}</span>
          </nav>

          <SectionHeader
            align="left"
            eyebrow={feature.eyebrow}
            title={feature.title}
            description={feature.metaDescription}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Register Institute Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/how-it-works"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              See How It Works
            </Link>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container className="space-y-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>The Operational Problem</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-sm leading-relaxed">{feature.problem}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Who This Is Built For</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {feature.audience.map((aud) => (
                    <li key={aud} className="text-foreground flex items-center gap-2">
                      <CheckCircle2
                        className="text-primary h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{aud}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              How {feature.eyebrow} Works in CertiDesk Pro
            </h2>
            <ol className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {feature.howItWorks.map((step, index) => (
                <li key={step} className="border-border bg-surface rounded-xl border p-5">
                  <span className="bg-primary-soft text-primary inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                  <p className="text-foreground mt-3 text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Core Capabilities
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
              {feature.capabilities.map((cap) => (
                <Card key={cap.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{cap.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted text-sm leading-relaxed">
                      {cap.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {feature.benefits.map((b) => (
                    <li key={b} className="text-foreground flex items-start gap-2">
                      <CheckCircle2
                        className="text-success mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="text-warning h-4 w-4" aria-hidden="true" />
                  Scope &amp; Limitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted space-y-2 text-sm">
                  {feature.limitations.map((lim) => (
                    <li key={lim}>{lim}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="text-primary h-4 w-4" aria-hidden="true" />
                  Security &amp; Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-sm leading-relaxed">
                  {feature.securityNote}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="mt-4 space-y-4">
              {feature.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="border-border bg-surface rounded-xl border p-5"
                >
                  <h3 className="text-foreground text-base font-semibold">
                    {faq.question}
                  </h3>
                  <p className="text-muted mt-2 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {related.length > 0 && (
            <div>
              <h2 className="text-foreground text-xl font-bold tracking-tight">
                Related Modules
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/features/${item.slug}`}
                    className="border-border bg-background hover:border-primary/40 rounded-xl border p-4 transition-colors"
                  >
                    <p className="text-primary text-xs font-semibold">{item.eyebrow}</p>
                    <p className="text-foreground mt-1 text-sm font-semibold">
                      {item.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Container>
      </Section>
    </PageContainer>
  );
}
