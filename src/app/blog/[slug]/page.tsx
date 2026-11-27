import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, User } from "lucide-react";
import { BLOG_ARTICLES, getBlogArticleBySlug } from "@/config/seo-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
} from "@/components/seo/json-ld";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export function generateStaticParams() {
  return BLOG_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);
  if (!article) {
    return buildPublicMetadata({
      title: "Article Not Found",
      description: "Requested CertiDesk Pro article was not found.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  return buildPublicMetadata({
    title: article.metaTitle,
    description: article.metaDescription,
    path: `/blog/${article.slug}`,
    keywords: article.keywords,
    ogType: "article",
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);
  if (!article) notFound();

  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: article.title, path: `/blog/${article.slug}` },
        ])}
      />
      <JsonLd
        data={buildArticleJsonLd({
          title: article.title,
          description: article.metaDescription,
          path: `/blog/${article.slug}`,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          authorName: article.authorName,
        })}
      />

      <Section spacing="md" background="surface">
        <Container size="md">
          <nav aria-label="Breadcrumb" className="text-muted mb-5 text-xs">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/blog" className="hover:text-foreground">
              Blog
            </Link>{" "}
            / <span className="text-foreground font-medium">{article.cluster}</span>
          </nav>

          <Badge variant="primary">{article.cluster}</Badge>
          <h1 className="text-foreground mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="text-muted mt-4 text-base leading-relaxed">{article.excerpt}</p>

          <div className="text-muted mt-5 flex flex-wrap items-center gap-5 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              {article.authorName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Updated {article.updatedAt} · {article.readTime}
            </span>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container size="md" className="space-y-10">
          {article.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="text-foreground text-xl font-bold tracking-tight">
                {section.heading}
              </h2>
              {section.paragraphs.map((p) => (
                <p key={p} className="text-muted text-sm leading-relaxed sm:text-base">
                  {p}
                </p>
              ))}
            </section>
          ))}

          <div className="border-border bg-surface rounded-2xl border p-6">
            <h2 className="text-foreground text-base font-semibold">
              Related Platform Modules
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {article.relatedFeatures.map((rf) => (
                <Link
                  key={rf.href}
                  href={rf.href}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {rf.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ))}
              <Link
                href="/register"
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                Register Your Institute
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
