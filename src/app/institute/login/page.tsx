import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PortalLoginForm } from "@/features/auth/components/portal-login-form";

export const metadata: Metadata = {
  title: "Institute Portal Sign In",
  description: "Sign in to your CertiDesk Pro Institute Admin portal.",
};

export default async function InstituteLoginPage() {
  const user = await getSessionUser();
  if (user?.role === "institute_admin" || user?.role === "staff") {
    redirect("/institute/dashboard");
  }

  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm">
          <PortalLoginForm
            portal="institute"
            badgeLabel="Institute Administration"
            title="Institute Portal Sign In"
            description="Enter your assigned Institute ID and password to access your campus workspace."
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
