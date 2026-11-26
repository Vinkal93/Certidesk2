import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Institute portal access information for administrators, staff, and students on CertiDesk.",
  alternates: { canonical: "/sign-in" },
};

export default function SignInPage() {
  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm">
          <Card elevated>
            <CardHeader className="items-center text-center">
              <div className="bg-primary-soft text-primary mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                <Lock className="h-6 w-6" aria-hidden="true" />
              </div>
              <Badge variant="primary">Portal Access</Badge>
              <CardTitle className="mt-2 text-2xl">Institute Portal Sign In</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted text-sm leading-relaxed">
                Role-based authentication for Super Admins, Institute Administrators,
                Teachers, and Students is scheduled for the upcoming platform module
                phase. No credentials are collected on this preview page.
              </p>

              <div className="border-border bg-surface rounded-lg border p-4 text-left">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    className="text-primary mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="text-muted text-xs leading-relaxed">
                    <p className="text-foreground font-semibold">
                      Planned Role-Based Portals
                    </p>
                    <p className="mt-1">
                      Dedicated sign-in flows for multi-institute administration, campus
                      staff, and student academic &amp; certificate access will connect
                      directly to verified institute workspaces.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/get-started"
                  className={buttonVariants({ variant: "primary" })}
                >
                  Request Workspace Setup
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/" className={buttonVariants({ variant: "outline" })}>
                  Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </PageContainer>
  );
}
