import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { RegisterInstituteForm } from "@/features/super-admin/components/register-institute-form";

export const metadata: Metadata = {
  title: "Register Institute",
  robots: { index: false, follow: false },
};

export default async function NewInstitutePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container size="lg">
          <div className="border-border mb-6 border-b pb-5">
            <Link
              href="/su/institutes"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Directory
            </Link>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Register New Institute
            </h1>
            <p className="text-muted mt-1 text-sm">
              Provisions Firebase Authentication, custom claims, wallet ledger, and
              one-time handoff credentials.
            </p>
          </div>

          <RegisterInstituteForm />
        </Container>
      </Section>
    </PageContainer>
  );
}
