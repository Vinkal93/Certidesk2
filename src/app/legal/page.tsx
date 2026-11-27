import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileDown, FileText, Mail, Scale, ShieldCheck } from "lucide-react";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { LEGAL_DOCUMENTS, LEGAL_ENTITY } from "@/config/legal";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = buildPublicMetadata({
  title: "Legal, Privacy & Compliance Center",
  description:
    "Official legal agreements, DPDP Act privacy policy, terms of service, prepaid wallet refund policy, DPA, SLA, and downloadable PDFs for CertiDesk Pro.",
  path: "/legal",
  keywords: [
    "certidesk pro legal",
    "certidesk privacy policy pdf",
    "edtech saas dpa india",
    "institute software terms of service",
  ],
});

export default function LegalHubPage() {
  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Legal Center", path: "/legal" },
        ])}
      />

      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="Legal & Compliance Center"
            title="Transparent governance for institutes, students, and verifiers"
            description="Access every official CertiDesk Pro agreement, data protection addendum, and service policy. Read online or download signed-ready PDF copies for your institutional records."
          />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
            <Badge variant="outline">Effective: {LEGAL_ENTITY.effectiveDate}</Badge>
            <Badge variant="outline">Jurisdiction: {LEGAL_ENTITY.jurisdiction}</Badge>
            <Badge variant="primary">7 Official Policies + PDF Exports</Badge>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {LEGAL_DOCUMENTS.map((doc) => (
              <Card key={doc.slug} className="flex flex-col justify-between">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="primary">{doc.eyebrow}</Badge>
                    <span className="text-muted text-xs font-medium">{doc.version}</span>
                  </div>
                  <CardTitle className="flex items-start gap-2 text-lg">
                    <FileText
                      className="text-primary mt-0.5 h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{doc.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <p className="text-muted text-sm leading-relaxed">
                      {doc.description}
                    </p>
                    <p className="text-muted text-xs">
                      <span className="text-foreground font-medium">Applies to:</span>{" "}
                      {doc.audience}
                    </p>
                  </div>

                  <div className="border-border flex flex-wrap items-center gap-2.5 border-t pt-4">
                    <Link
                      href={doc.href}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Read Document
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <a
                      href={`/api/legal/${doc.slug}/pdf`}
                      download={doc.pdfFilename}
                      className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                      <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                      Download PDF
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="border-border bg-surface mt-12 grid grid-cols-1 gap-6 rounded-2xl border p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-2">
              <div className="text-primary flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <Scale className="h-4 w-4" aria-hidden="true" />
                Grievance & Security Desk
              </div>
              <h2 className="text-foreground text-xl font-semibold">
                Need a custom institutional compliance review or data request?
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                Reach our Grievance Officer and Data Protection Desk at{" "}
                <a
                  href={`mailto:${LEGAL_ENTITY.supportEmail}`}
                  className="text-primary font-medium hover:underline"
                >
                  {LEGAL_ENTITY.supportEmail}
                </a>{" "}
                or review our live multi-tenant security architecture.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/security"
                className={buttonVariants({ variant: "outline", size: "md" })}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Security Architecture
              </Link>
              <a
                href={`mailto:${LEGAL_ENTITY.supportEmail}`}
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Contact Legal Desk
              </a>
            </div>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
