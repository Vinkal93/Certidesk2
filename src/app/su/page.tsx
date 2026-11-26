import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PortalLoginForm } from "@/features/auth/components/portal-login-form";

export const metadata: Metadata = {
  title: "Super Admin Sign In",
  description: "Restricted platform administration sign-in for CertiDesk Pro.",
  robots: { index: false, follow: false },
};

export default async function SuperAdminLoginPage() {
  const user = await getSessionUser();
  if (user?.role === "super_admin") {
    redirect("/su/dashboard");
  }

  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm">
          <PortalLoginForm
            portal="super_admin"
            badgeLabel="Restricted Platform Control"
            title="Super Admin Sign In"
            description="Only pre-provisioned platform administrators may sign in here. Public registration is disabled."
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
