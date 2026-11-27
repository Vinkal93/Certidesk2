import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileDown,
  Globe,
  Mail,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import { LEGAL_DOCUMENTS, LEGAL_ENTITY, type LegalDocument } from "@/config/legal";
import { PageContainer } from "@/components/layout";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalPrintButton } from "./legal-print-button";

interface LegalDocumentViewProps {
  doc: LegalDocument;
}

export function LegalDocumentView({ doc }: LegalDocumentViewProps) {
  const pdfDownloadUrl = `/api/legal/${doc.slug}/pdf`;
  const pdfInlineUrl = `/api/legal/${doc.slug}/pdf?inline=1`;

  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Legal Center", path: "/legal" },
          { name: doc.title, path: doc.href },
        ])}
      />

      <Section spacing="md" background="surface">
        <Container>
          <nav
            aria-label="Breadcrumb"
            className="text-muted mb-5 flex flex-wrap items-center gap-1.5 text-xs print:hidden"
          >
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link href="/legal" className="hover:text-foreground transition-colors">
              Legal Center
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-foreground font-medium">{doc.shortTitle}</span>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">{doc.eyebrow}</Badge>
                <Badge variant="outline">{doc.version}</Badge>
              </div>
              <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
                {doc.title}
              </h1>
              <p className="text-muted text-base leading-relaxed">{doc.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <a
                href={pdfDownloadUrl}
                download={doc.pdfFilename}
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                <FileDown className="h-4 w-4" aria-hidden="true" />
                Download PDF
              </a>
              <a
                href={pdfInlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "md" })}
              >
                Preview PDF
              </a>
              <LegalPrintButton />
            </div>
          </div>

          <div className="border-border bg-card mt-8 grid grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-2.5">
              <Calendar
                className="text-primary mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
                  Effective Date
                </p>
                <p className="text-foreground text-sm font-medium">{doc.effectiveDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                className="text-primary mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
                  Last Updated
                </p>
                <p className="text-foreground text-sm font-medium">{doc.lastUpdated}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Scale
                className="text-primary mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
                  Jurisdiction
                </p>
                <p className="text-foreground text-sm font-medium">{doc.jurisdiction}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Users
                className="text-primary mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
                  Applies To
                </p>
                <p className="text-foreground text-sm font-medium">{doc.audience}</p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Main Legal Content */}
            <div className="space-y-8 lg:col-span-8">
              {doc.highlights.length > 0 && (
                <Card className="border-primary/20 bg-primary-soft/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-foreground text-base">
                      Executive Summary & Key Commitments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {doc.highlights.map((item) => (
                      <div key={item} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2
                          className="text-primary mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-foreground">{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-8">
                {doc.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="border-border scroll-mt-24 border-b pb-7 last:border-b-0"
                  >
                    <h2 className="text-foreground mb-3 text-xl font-semibold tracking-tight">
                      {section.heading}
                    </h2>
                    <div className="text-muted space-y-3 text-sm leading-relaxed">
                      {section.paragraphs.map((para, idx) => (
                        <p key={idx}>{para}</p>
                      ))}
                    </div>
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="text-muted mt-4 space-y-2.5 pl-1 text-sm leading-relaxed">
                        {section.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span
                              className="bg-primary mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                              aria-hidden="true"
                            />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              {/* Legal & Grievance Footer Card */}
              <Card className="bg-surface">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-foreground text-sm font-semibold">
                      Questions or Formal Legal Requests?
                    </p>
                    <p className="text-muted text-xs leading-relaxed">
                      Contact our Grievance & Compliance Desk at{" "}
                      <a
                        href={`mailto:${LEGAL_ENTITY.supportEmail}`}
                        className="text-primary font-medium hover:underline"
                      >
                        {LEGAL_ENTITY.supportEmail}
                      </a>
                      .
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5 print:hidden">
                    <a
                      href={`mailto:${LEGAL_ENTITY.supportEmail}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      Email Compliance
                    </a>
                    <a
                      href={pdfDownloadUrl}
                      download={doc.pdfFilename}
                      className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                      <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                      Save PDF
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sticky Sidebar */}
            <aside className="space-y-6 lg:col-span-4 print:hidden">
              <div className="space-y-6 lg:sticky lg:top-24">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">On This Page</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {doc.sections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className="text-muted hover:text-primary hover:bg-surface block rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                      >
                        {section.heading}
                      </a>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Globe className="text-primary h-4 w-4" aria-hidden="true" />
                      All Legal & Compliance Docs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {LEGAL_DOCUMENTS.map((item) => {
                      const active = item.slug === doc.slug;
                      return (
                        <div
                          key={item.slug}
                          className="flex items-center justify-between gap-2"
                        >
                          <Link
                            href={item.href}
                            className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? "bg-primary-soft text-primary font-semibold"
                                : "text-muted hover:text-foreground hover:bg-surface"
                            }`}
                          >
                            {item.shortTitle}
                          </Link>
                          <a
                            href={`/api/legal/${item.slug}/pdf`}
                            download={item.pdfFilename}
                            title={`Download ${item.shortTitle} PDF`}
                            aria-label={`Download ${item.shortTitle} PDF`}
                            className="text-muted hover:text-primary rounded p-1.5 transition-colors"
                          >
                            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        </div>
                      );
                    })}
                    <div className="border-border mt-3 border-t pt-3">
                      <Link
                        href="/legal"
                        className="text-primary block px-2.5 text-xs font-semibold hover:underline"
                      >
                        View Legal & Compliance Hub →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
