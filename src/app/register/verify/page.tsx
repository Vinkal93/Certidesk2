import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingActionButton } from "@/features/onboarding/components/onboarding-actions";

export const metadata: Metadata = {
  title: "Verify Registration",
  robots: { index: false, follow: false },
};

export default async function RegisterVerifyPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "institute_admin") {
    redirect("/register");
  }

  const institute = await resolveAuthorizedInstitute(user);

  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm">
          <Card elevated>
            <CardHeader>
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="success">Account Created</Badge>
                <span className="text-muted text-xs">Step 2 of 4</span>
              </div>
              <CardTitle className="text-2xl">
                Confirm your Institute ID &amp; Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="border-border bg-surface rounded-xl border p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <KeyRound className="text-primary h-4 w-4" aria-hidden="true" />
                  Your Assigned Institute ID (save this for sign-in)
                </div>
                <p className="text-foreground mt-1.5 font-mono text-xl font-bold tracking-wide">
                  {institute.code}
                </p>
                <p className="text-muted mt-1 text-xs">
                  Registered Email: <span className="font-medium">{institute.email}</span>{" "}
                  · Mobile: <span className="font-medium">{institute.phone}</span>
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  Your workspace is provisioned with a zero-balance prepaid wallet
                  (₹0.00). Confirm your contact details below to proceed to wallet setup.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  href="/institute/dashboard"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Go to Dashboard
                </Link>
                <OnboardingActionButton
                  action="mark_verified"
                  nextHref="/onboarding/institute"
                  label="Verify & Continue"
                  icon="arrow"
                />
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </PageContainer>
  );
}
