import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = buildPublicMetadata({
  title: "How CertiDesk Pro Works",
  description:
    "Step-by-step workflow from self-service institute registration and Razorpay wallet recharge to student admission, marksheets, and public certificate verification.",
  path: "/how-it-works",
  keywords: [
    "how institute management software works",
    "certidesk pro workflow",
    "student admission and certificate workflow",
  ],
});

const steps = [
  {
    step: "01",
    title: "Self-Register Your Institute",
    detail:
      "Create your owner account and receive a unique Institute ID and isolated workspace via /register.",
    link: { label: "Register Institute", href: "/register" },
  },
  {
    step: "02",
    title: "Configure Courses, Batches & Staff",
    detail:
      "Set up your courses, active batches, and individual staff logins inside the Institute Admin portal.",
    link: {
      label: "Explore Institute Management",
      href: "/features/institute-management",
    },
  },
  {
    step: "03",
    title: "Recharge Prepaid Wallet (or Skip Initially)",
    detail:
      "Recharge ₹500, ₹1,000, or ₹2,000 (with ₹200 bonus) via Razorpay when ready to admit students.",
    link: { label: "View Prepaid Wallet", href: "/features/wallet" },
  },
  {
    step: "04",
    title: "Admit Students & Track Attendance/Fees",
    detail:
      "Admit students atomically using available wallet balance, assign Student IDs, mark batch attendance, and log fee installments.",
    link: { label: "Student Management", href: "/features/student-management" },
  },
  {
    step: "05",
    title: "Publish Marksheets & Issue Verified Certificates",
    detail:
      "Record examination marks, publish marksheets to the Student Portal, and issue certificates verifiable publicly at /verify/[verificationId].",
    link: { label: "Certificate Generator", href: "/features/certificate-generator" },
  },
];

export default function HowItWorksPage() {
  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "How It Works", path: "/how-it-works" },
        ])}
      />

      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="Platform Workflow"
            title="From institute registration to verified certificates in five steps"
            description="See how CertiDesk Pro connects self-service onboarding, prepaid billing, academic tracking, and credential verification."
          />
        </Container>
      </Section>

      <Section spacing="md">
        <Container className="space-y-6">
          {steps.map((item) => (
            <Card key={item.step}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary-soft text-primary inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold">
                      {item.step}
                    </span>
                    <CardTitle>{item.title}</CardTitle>
                  </div>
                  <Link
                    href={item.link.href}
                    className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                  >
                    {item.link.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-sm leading-relaxed">{item.detail}</p>
              </CardContent>
            </Card>
          ))}

          <div className="border-border bg-surface flex flex-col items-center justify-between gap-4 rounded-2xl border p-8 sm:flex-row">
            <div className="space-y-1">
              <p className="text-foreground flex items-center gap-2 text-lg font-semibold">
                <CheckCircle2 className="text-success h-5 w-5" aria-hidden="true" />
                Ready to launch your institute workspace?
              </p>
              <p className="text-muted text-sm">
                Registration is free and takes under two minutes.
              </p>
            </div>
            <Link
              href="/register"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
