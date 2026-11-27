import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listInstituteStaff } from "@/services/staff.service";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { StaffManagementClient } from "@/features/staff/components/staff-management-client";

export const metadata: Metadata = {
  title: "Institute Staff",
  robots: { index: false, follow: false },
};

export default async function InstituteStaffPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }

  if (!hasStaffPermission(user, "staff:read")) {
    redirect("/institute/dashboard");
  }

  const staff = await listInstituteStaff(user);

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 border-b pb-5">
            <Link
              href="/institute/dashboard"
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Dashboard
            </Link>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Staff &amp; Permissions
            </h1>
          </div>

          <StaffManagementClient
            initialStaff={staff}
            canCreate={user.role === "institute_admin"}
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
