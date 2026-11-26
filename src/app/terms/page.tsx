import type { Metadata } from "next";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${siteConfig.name} institute management platform.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PageContainer>
      <Section spacing="md" background="surface">
        <Container size="md">
          <SectionHeader
            align="left"
            eyebrow="Legal"
            title="Terms of Service"
            description="General terms governing the use of the CertiDesk platform."
          />
        </Container>
      </Section>
      <Section spacing="md">
        <Container size="md" className="text-muted space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-foreground text-lg font-semibold">1. Platform Scope</h2>
            <p>
              {siteConfig.name} provides software tools designed to assist educational and
              training institutes with admissions, attendance, fee tracking, examinations,
              marksheets, and certificate management.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground text-lg font-semibold">
              2. Acceptable Institutional Use
            </h2>
            <p>
              Institutes are responsible for the accuracy of academic records, fee
              structures, and official documents generated through their workspaces.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground text-lg font-semibold">3. Contact</h2>
            <p>
              Questions regarding these terms may be directed to{" "}
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="text-primary font-medium hover:underline"
              >
                {siteConfig.supportEmail}
              </a>
              .
            </p>
          </section>
        </Container>
      </Section>
    </PageContainer>
  );
}
