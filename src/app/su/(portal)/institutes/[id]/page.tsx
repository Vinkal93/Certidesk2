import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthError, getSessionUser } from "@/lib/security/session";
import { getInstituteById, getInstituteTransactions } from "@/services/institute.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { InstituteDetailClient } from "@/features/super-admin/components/institute-detail-client";

export const metadata: Metadata = {
  title: "Institute Profile",
  robots: { index: false, follow: false },
};

export default async function SuperAdminInstituteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const { id } = await params;

  let institute;
  try {
    institute = await getInstituteById(id);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const transactions = await getInstituteTransactions(institute.id);

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
            <div>
              <Link
                href="/su/institutes"
                className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to Institutes
              </Link>
              <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
                {institute.name}
              </h1>
              <p className="text-muted mt-0.5 font-mono text-xs">
                {institute.code} · {institute.id}
              </p>
            </div>
          </div>

          <InstituteDetailClient
            initialInstitute={institute}
            transactions={transactions}
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
