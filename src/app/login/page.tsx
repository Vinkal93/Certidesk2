import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PortalSelectorLogin } from "@/features/auth/components/portal-selector-login";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your CertiDesk Pro Institute or Student portal.",
};

export default async function LoginPage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (user?.role === "institute_admin" || user?.role === "staff") {
    redirect("/institute/dashboard");
  }
  if (user?.role === "student") {
    redirect("/student/dashboard");
  }

  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm">
          <PortalSelectorLogin />
        </Container>
      </Section>
    </PageContainer>
  );
}
