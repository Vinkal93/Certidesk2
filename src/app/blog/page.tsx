import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { BLOG_ARTICLES } from "@/config/seo-pages";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = buildPublicMetadata({
  title: "Institute Management Blog & Guides",
  description:
    "Practical guides on computer institute management, student admission workflows, marksheet formatting, verifiable certificates, and prepaid SaaS billing.",
  path: "/blog",
  keywords: [
    "institute management blog",
    "computer institute operations guide",
    "certificate verification guide",
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
          <SectionHeader
            eyebrow="Resources & Guides"
            title="Practical guides for modern educational and training institutes"
            description="Actionable workflows on digital admissions, attendance, examination marksheets, verifiable certificates, and institute finance."
          />
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {BLOG_ARTICLES.map((article) => (
              <Card key={article.slug} className="flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant="primary">{article.cluster}</Badge>
                      <span className="text-muted inline-flex items-center gap-1 text-xs">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        {article.updatedAt} · {article.readTime}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted text-sm leading-relaxed">
                      {article.excerpt}
                    </p>
                  </CardContent>
                </div>
                <div className="px-6 pt-2 pb-6">
                  <Link
                    href={`/blog/${article.slug}`}
                    className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                  >
                    Read Guide
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
