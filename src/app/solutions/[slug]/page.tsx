import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SOLUTION_PAGES, getFeatureBySlug, getSolutionBySlug } from "@/config/seo-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/components/seo/json-ld";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export function generateStaticParams() {
  return SOLUTION_PAGES.map((sol) => ({ slug: sol.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolutionBySlug(slug);
  if (!solution) {
    return buildPublicMetadata({
      title: "Solution Not Found",
      description: "Requested CertiDesk Pro solution page was not found.",
      path: `/solutions/${slug}`,
      noIndex: true,
    });
  }

  return buildPublicMetadata({
    title: solution.metaTitle,
    description: solution.metaDescription,
    path: `/solutions/${solution.slug}`,
    keywords: solution.keywords,
  });
}

export default async function SolutionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = getSolutionBySlug(slug);
  if (!solution) notFound();

  const modules = solution.recommendedModules
    .map((m) => getFeatureBySlug(m))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Solutions", path: "/features" },
          { name: solution.title, path: `/solutions/${solution.slug}` },
        ])}
      />
      <JsonLd data={buildFaqJsonLd(solution.faqs)} />

      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            align="left"
            eyebrow={solution.eyebrow}
            title={solution.title}
            description={solution.overview}
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Start Institute Registration
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Talk to Our Team
            </Link>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container className="space-y-12">
          <div>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Operational Challenges Solved
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {solution.challenges.map((c) => (
                <li
                  key={c}
                  className="border-border bg-surface flex items-start gap-2.5 rounded-xl border p-5 text-sm"
                >
                  <CheckCircle2
                    className="text-primary mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-foreground">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              End-to-End Institute Workflow
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
              {solution.workflows.map((wf) => (
                <Card key={wf.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{wf.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted text-sm leading-relaxed">{wf.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Recommended CertiDesk Pro Modules
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {modules.map((mod) => (
                <Link
                  key={mod.slug}
                  href={`/features/${mod.slug}`}
                  className="border-border bg-background hover:border-primary/40 rounded-xl border p-4 transition-colors"
                >
                  <p className="text-primary text-xs font-semibold">{mod.eyebrow}</p>
                  <p className="text-foreground mt-1 text-sm font-semibold">
                    {mod.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="mt-4 space-y-4">
              {solution.faqs.map((faq) => (
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
        </Container>
      </Section>
    </PageContainer>
  );
}
