import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Institute Profile",
  robots: { index: false, follow: false },
};

export default async function InstituteProfilePage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }

  const institute = await resolveAuthorizedInstitute(user);

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container size="md">
          <div className="border-border mb-6 border-b pb-5">
            <Link
              href="/institute/dashboard"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Dashboard
            </Link>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Institute Profile
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{institute.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="border-border flex justify-between border-b pb-2">
                <span className="text-muted">Institute Code</span>
                <span className="text-foreground font-mono font-semibold">
                  {institute.code}
                </span>
              </div>
              <div className="border-border flex justify-between border-b pb-2">
                <span className="text-muted">Owner Name</span>
                <span className="text-foreground font-medium">{institute.ownerName}</span>
              </div>
              <div className="border-border flex justify-between border-b pb-2">
                <span className="text-muted">Email</span>
                <span className="text-foreground font-medium">{institute.email}</span>
              </div>
              <div className="border-border flex justify-between border-b pb-2">
                <span className="text-muted">Phone</span>
                <span className="text-foreground font-medium">{institute.phone}</span>
              </div>
              <div className="border-border flex justify-between border-b pb-2">
                <span className="text-muted">Address</span>
                <span className="text-foreground font-medium">{institute.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Admission / Update Fee</span>
                <span className="text-foreground font-medium">
                  ₹{(institute.pricing.admissionFeePaise / 100).toFixed(2)} / ₹
                  {(institute.pricing.profileUpdateFeePaise / 100).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </PageContainer>
  );
}
