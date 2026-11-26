import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { OnboardingForm } from "@/components/marketing/onboarding-form";

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Request a CertiDesk workspace setup for your educational or training institute.",
  alternates: { canonical: "/get-started" },
};

const includedItems = [
  "Structured student admission & batch enrollment schema",
  "Installment-ready fee collection and pending dues tracking",
  "Daily batch attendance and faculty schedule coordination",
  "Subject-wise exam marks entry, marksheets, and certificates",
];

export default function GetStartedPage() {
  return (
    <PageContainer>
      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="Get Started"
            title="Prepare your institute workspace"
            description="Tell us about your campus structure and operational priorities so your CertiDesk environment is configured cleanly."
          />
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-5">
              <h2 className="text-foreground text-xl font-semibold">
                What your workspace includes
              </h2>
              <p className="text-muted text-sm leading-relaxed">
                Every CertiDesk workspace is structured to keep your academic, financial,
                and certification records consistent across departments and branches.
              </p>
              <ul className="space-y-3.5">
                {includedItems.map((item) => (
                  <li
                    key={item}
                    className="text-foreground flex items-start gap-3 text-sm"
                  >
                    <CheckCircle2
                      className="text-success mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-7">
              <OnboardingForm />
            </div>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
