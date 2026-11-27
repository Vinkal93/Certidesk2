import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Database, Lock, ShieldCheck, Wallet } from "lucide-react";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = buildPublicMetadata({
  title: "Security & Multi-Tenant Architecture",
  description:
    "How CertiDesk Pro protects institute and student records using server-side Firebase Admin sessions, tenant isolation, Firestore rules, and atomic Razorpay verification.",
  path: "/security",
  keywords: [
    "institute software security",
    "multi-tenant education SaaS security",
    "certidesk pro security",
  ],
});

const pillars = [
  {
    icon: Lock,
    title: "Server-Enforced Sessions & Role Boundaries",
    description:
      "Portal access for Super Admin, Institute Admin, Staff, and Students is verified server-side via Firebase Admin HTTP-only session cookies and role claims.",
  },
  {
    icon: Database,
    title: "Strict Multi-Tenant Isolation",
    description:
      "Every institute record, student profile, attendance log, fee entry, and marksheet is scoped by instituteId and enforced in Firestore security rules.",
  },
  {
    icon: Wallet,
    title: "Idempotent & Atomic Payment Ledger",
    description:
      "Razorpay orders and webhooks validate cryptographic signatures server-side and execute inside atomic Firestore transactions to prevent duplicate credits or negative balances.",
  },
  {
    icon: ShieldCheck,
    title: "Redacted Audit Logs & Private Route Protection",
    description:
      "Privileged actions are logged with sensitive fields (passwords, OTPs, session cookies, tokens, and secrets) redacted, while private portal routes are excluded from search indexing.",
  },
];

export default function SecurityPage() {
  return (
    <PageContainer>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Security", path: "/security" },
        ])}
      />

      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="Trust & Architecture"
            title="Built with server-side tenant isolation and auditable ledgers"
            description="CertiDesk Pro protects institutional student records, payment workflows, and administrative access across every portal."
          />
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card key={pillar.title}>
                  <CardHeader>
                    <div className="bg-primary-soft text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <CardTitle>{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted text-sm leading-relaxed">
                      {pillar.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/legal"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Legal & Compliance Hub
            </Link>
            <Link
              href="/dpa"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Data Processing Addendum
            </Link>
            <Link
              href="/privacy"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Read Privacy Policy
            </Link>
            <Link
              href="/terms"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Read Terms of Service
            </Link>
            <Link
              href="/register"
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              Register Institute
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
