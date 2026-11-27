import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = buildPublicMetadata({
  title: "About CertiDesk Pro",
  description:
    "Learn how CertiDesk Pro is engineered to unify admissions, attendance, fees, examinations, marksheets, and verifiable certificates for modern educational institutes.",
  path: "/about",
});

const principles = [
  {
    icon: Layers,
    title: "Unified Academic & Financial Ledger",
    description:
      "Student profiles, batch enrollments, fee installments, attendance logs, and exam records stay connected in one structured system.",
  },
  {
    icon: Building2,
    title: "Built for Multi-Branch Growth",
    description:
      "Designed from day one to support single-campus academies as cleanly as multi-branch training networks with centralized oversight.",
  },
  {
    icon: ShieldCheck,
    title: "Audit-Ready Documentation",
    description:
      "Consistent marksheets, fee receipts, and verifiable completion certificates reduce manual paperwork and administrative errors.",
  },
  {
    icon: Sparkles,
    title: "Fast, Accessible Interface",
    description:
      "Engineered for everyday staff speed with keyboard-friendly forms, clear typography, and reliable performance on standard connections.",
  },
];

export default function AboutPage() {
  return (
    <PageContainer>
      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="About CertiDesk"
            title="Purpose-built software for educational and training institutes"
            description="CertiDesk replaces fragmented spreadsheets, paper registers, and disconnected billing tools with one cohesive operating system for institute administrators, faculty, and students."
          />
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {principles.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title}>
                  <CardHeader>
                    <div className="bg-primary-soft text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="border-border bg-surface mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl border p-8 sm:flex-row">
            <div>
              <h2 className="text-foreground text-xl font-semibold">
                Ready to see how CertiDesk fits your institute?
              </h2>
              <p className="text-muted mt-1 text-sm">
                Share your institute structure or explore our planned modules.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/contact" className={buttonVariants({ variant: "outline" })}>
                Contact Us
              </Link>
              <Link
                href="/get-started"
                className={buttonVariants({ variant: "primary" })}
              >
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
