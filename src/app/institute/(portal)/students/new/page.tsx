import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { listBatches, listCourses } from "@/services/academic.service";
import { resolveWalletBuckets } from "@/services/wallet.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { AdmitStudentForm } from "@/features/students/components/admit-student-form";

export const metadata: Metadata = {
  title: "Admit Student",
  robots: { index: false, follow: false },
};

export default async function AdmitStudentPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }

  const [institute, courses, batches] = await Promise.all([
    resolveAuthorizedInstitute(user),
    listCourses(user).catch(() => []),
    listBatches(user).catch(() => []),
  ]);
  const wallet = resolveWalletBuckets(institute);

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
            walletBalancePaise={wallet.totalSpendableBalancePaise}
            courses={courses}
            batches={batches}
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
