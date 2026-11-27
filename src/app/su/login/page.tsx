import type { Metadata } from "next";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PortalLoginForm } from "@/features/auth/components/portal-login-form";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "Super Admin Sign In",
  "Restricted Super Admin portal login for CertiDesk Pro."
);

export default function SuperAdminLoginPage() {
  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm">
          <PortalLoginForm
            portal="super_admin"
            badgeLabel="Platform Super Admin"
            title="Super Admin Sign In"
            description="Restricted platform administration access. Only allowlisted Super Admin accounts are permitted."
          />
        </Container>
      </Section>
    </PageContainer>
  );
}
