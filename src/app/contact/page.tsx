import type { Metadata } from "next";
import { Mail, Clock, Building2 } from "lucide-react";
import { siteConfig } from "@/config/site";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach out to the CertiDesk team to discuss institute onboarding, multi-branch requirements, or product architecture.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageContainer>
      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="Contact"
            title="Talk with us about your institute workflows"
            description="Have questions about admissions, fee tracking, attendance, marksheets, or multi-branch administration? Send us a note."
          />
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-5">
              <div className="border-border bg-surface rounded-xl border p-6">
                <div className="flex items-start gap-3.5">
                  <div className="bg-primary-soft text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-foreground text-base font-semibold">
                      Direct Email
                    </h2>
                    <p className="text-muted mt-1 text-sm">
                      For general inquiries, onboarding questions, and partnership
                      requests.
                    </p>
                    <a
                      href={`mailto:${siteConfig.supportEmail}`}
                      className="text-primary mt-2 inline-block text-sm font-medium hover:underline"
                    >
                      {siteConfig.supportEmail}
                    </a>
                  </div>
                </div>
              </div>

              <div className="border-border bg-surface rounded-xl border p-6">
                <div className="flex items-start gap-3.5">
                  <div className="bg-primary-soft text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-foreground text-base font-semibold">
                      Designed for Every Institute Size
                    </h2>
                    <p className="text-muted mt-1 text-sm">
                      Whether you run a single coaching center or coordinate multiple
                      vocational campuses, we tailor the rollout to your academic
                      calendar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-border bg-surface rounded-xl border p-6">
                <div className="flex items-start gap-3.5">
                  <div className="bg-primary-soft text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-foreground text-base font-semibold">
                      Structured Onboarding
                    </h2>
                    <p className="text-muted mt-1 text-sm">
                      Share your current student strength, course structure, and
                      certificate templates so we can map a smooth transition.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
