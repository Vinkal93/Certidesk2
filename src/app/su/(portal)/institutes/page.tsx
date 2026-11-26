import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { listInstitutes } from "@/services/institute.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buttonVariants } from "@/components/ui/button";
import { InstituteDirectoryClient } from "@/features/super-admin/components/institute-directory-client";

export const metadata: Metadata = {
  title: "Institute Directory",
  robots: { index: false, follow: false },
};

export default async function SuperAdminInstitutesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const directory = await listInstitutes({ page: 1, pageSize: 10 });

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
            <div>
              <Link
                href="/su/dashboard"
                className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to Dashboard
              </Link>
              <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
                Institute Directory
              </h1>
            </div>
            <Link
              href="/su/institutes/new"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Register Institute
            </Link>
          </div>

          <InstituteDirectoryClient
            initialItems={directory.items}
            initialTotal={directory.total}
            initialTotalPages={directory.totalPages}
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
