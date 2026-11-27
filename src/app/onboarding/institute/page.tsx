import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Institute Onboarding",
  robots: { index: false, follow: false },
};

export default async function OnboardingInstitutePage() {
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
                <Badge variant="primary">Onboarding · Step 2</Badge>
                <span className="text-muted text-xs">Institute Profile</span>
              </div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Building2 className="text-primary h-5 w-5" aria-hidden="true" />
                {institute.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="border-border bg-surface grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2">
                <div>
                  <p className="text-muted text-xs">Institute ID</p>
                  <p className="font-mono font-semibold">{institute.code}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Owner Name</p>
                  <p className="font-medium">{institute.ownerName}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Official Email</p>
                  <p className="font-medium">{institute.email}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Mobile Number</p>
                  <p className="font-medium">{institute.phone}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-muted text-xs">Address</p>
                  <p className="font-medium">{institute.address}</p>
                </div>
              </div>

              <div className="border-border bg-background rounded-xl border p-4 text-xs">
                <p className="text-foreground font-semibold">
                  Configured Platform Charges
                </p>
                <p className="text-muted mt-1">
                  Student Admission: ₹
                  {(institute.pricing.admissionFeePaise / 100).toFixed(2)} · Chargeable
                  Profile Edit: ₹
                  {(institute.pricing.profileUpdateFeePaise / 100).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/onboarding/complete"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Skip to Summary
                </Link>
                <Link
                  href="/onboarding/wallet"
                  className={buttonVariants({ variant: "primary" })}
                >
                  Continue to Wallet Recharge
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </PageContainer>
  );
}
