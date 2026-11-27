import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, GraduationCap } from "lucide-react";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "Sign In",
  "Choose your CertiDesk Pro Institute Admin or Student portal."
);

export default function LoginPage() {
  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="md">
          <div className="mb-8 text-center">
            <h1 className="text-foreground text-3xl font-bold tracking-tight">
              Sign in to CertiDesk Pro
            </h1>
            <p className="text-muted mt-2 text-sm">
              Select your portal below to continue with your dedicated login screen.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link href="/login/institute" className="group block">
              <Card interactive className="h-full">
                <CardHeader>
                  <div className="bg-primary-soft text-primary mb-2 flex h-11 w-11 items-center justify-center rounded-xl">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle>Institute Admin &amp; Staff Portal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted text-sm leading-relaxed">
                    Sign in using your Institute ID, registered email, or mobile number to
                    manage admissions, fees, accounts, and certificates.
                  </p>
                  <span className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold group-hover:underline">
                    Continue to Institute Login
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/login/student" className="group block">
              <Card interactive className="h-full">
                <CardHeader>
                  <div className="bg-primary-soft text-primary mb-2 flex h-11 w-11 items-center justify-center rounded-xl">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle>Student Portal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted text-sm leading-relaxed">
                    Sign in with your assigned Student ID and password to view attendance,
                    fee receipts, marksheets, and certificates.
                  </p>
                  <span className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold group-hover:underline">
                    Continue to Student Login
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
