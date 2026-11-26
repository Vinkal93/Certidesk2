import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PortalLoginForm } from "@/features/auth/components/portal-login-form";

export const metadata: Metadata = {
  title: "Student Portal Sign In",
  description: "Sign in to your CertiDesk Pro Student portal.",
};

export default async function StudentLoginPage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (user?.role === "student") {
    redirect("/student/dashboard");
  }

  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm">
          <PortalLoginForm
            portal="student"
            badgeLabel="Student Access"
            title="Student Portal Sign In"
            description="Enter the Student ID and password issued by your institute."
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
