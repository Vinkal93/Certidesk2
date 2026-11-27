import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { PageContainer, SectionHeader } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { RegisterWizard } from "@/features/onboarding/components/register-wizard";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "Register Institute",
  "Self-register your educational or training institute on CertiDesk Pro and activate your prepaid workspace."
);

const benefits = [
  "Instant unique Institute ID and isolated multi-tenant workspace",
  "Prepaid wallet billing — start with ₹0 and recharge anytime",
  "₹200 promotional bonus on ₹2,000 initial wallet recharge",
  "Verified Razorpay checkout and atomic ledger auditability",
];

export default async function RegisterPage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (user?.role === "institute_admin") {
    redirect("/onboarding/wallet");
  }

  return (
    <PageContainer>
      <Section spacing="md" background="surface">
        <Container>
          <SectionHeader
            eyebrow="Self-Service Registration"
            title="Launch your CertiDesk Pro workspace"
            description="Register your institute in two quick steps. Recharge your prepaid wallet now or skip for later."
          />

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <div className="border-border bg-background rounded-2xl border p-6 shadow-xs">
                <div className="text-navy mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="text-primary h-4 w-4" aria-hidden="true" />
                  Enterprise Multi-Tenant Isolation
                </div>
                <ul className="space-y-3">
                  {benefits.map((item) => (
                    <li
                      key={item}
                      className="text-foreground flex items-start gap-2.5 text-sm"
                    >
                      <CheckCircle2
                        className="text-success mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-7">
              <RegisterWizard />
            </div>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
