import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PortalLoginForm } from "@/features/auth/components/portal-login-form";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "Institute Login",
  "Sign in to your CertiDesk Pro Institute Admin portal using Institute ID, email, or mobile number."
);

export default function InstituteDedicatedLoginPage() {
  return (
    <PageContainer>
      <Section spacing="lg" background="surface">
        <Container size="sm" className="space-y-4">
          <Link
            href="/login"
            className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All Portals
          </Link>
          <PortalLoginForm
            portal="institute"
            badgeLabel="Institute Administration"
            title="Institute Portal Sign In"
            description="Enter your Institute ID, registered owner email, or registered mobile number along with your password."
          />
          <p className="text-muted text-center text-xs">
            New institute?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Self-register here
            </Link>
          </p>
        </Container>
      </Section>
    </PageContainer>
  );
}
