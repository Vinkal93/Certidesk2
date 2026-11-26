import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { AdmitStudentForm } from "@/features/students/components/admit-student-form";

export const metadata: Metadata = {
  title: "Admit Student",
  robots: { index: false, follow: false },
};

export default async function AdmitStudentPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }

  const institute = await resolveAuthorizedInstitute(user);

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container size="md">
          <div className="border-border mb-6 border-b pb-5">
            <Link
              href="/institute/students"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Students
            </Link>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Admit New Student
            </h1>
            <p className="text-muted mt-1 text-sm">
              Generates Student ID, Firebase Auth credentials, and deducts admission
              charge atomically from your institute wallet.
            </p>
          </div>

          <AdmitStudentForm
            admissionFeePaise={institute.pricing.admissionFeePaise}
            walletBalancePaise={institute.walletBalancePaise}
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
