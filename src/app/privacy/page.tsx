import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Privacy Policy",
  description: `Privacy Policy for ${siteConfig.name} institute management platform.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <PageContainer>
      <Section spacing="md" background="surface">
        <Container size="md">
          <SectionHeader
            align="left"
            eyebrow="Legal"
            title="Privacy Policy"
            description="How CertiDesk approaches institutional and student data stewardship."
          />
        </Container>
      </Section>
      <Section spacing="md">
        <Container size="md" className="text-muted space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-foreground text-lg font-semibold">
              1. Institutional Data Ownership
            </h2>
            <p>
              Educational and training institutes retain full ownership of their student
              records, fee ledgers, attendance logs, marksheets, and issued certificates.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground text-lg font-semibold">
              2. Information Collected on Inquiry Forms
            </h2>
            <p>
              Contact and workspace setup forms validate your institute name, contact
              email, and operational requirements locally in the browser during this
              foundation phase.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground text-lg font-semibold">3. Contact</h2>
            <p>
              For privacy questions, reach out to{" "}
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
