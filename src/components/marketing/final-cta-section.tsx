import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buttonVariants } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <Section spacing="md" background="navy">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold tracking-wider text-blue-300 uppercase">
            Get Started with CertiDesk
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Bring structure to every admission, fee ledger, exam, and certificate.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Prepare your institute workspace or speak with our team about rolling out
            CertiDesk across your campus or multi-branch network.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/get-started"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Request Workspace Setup
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "border-white/25 bg-white/10 text-white hover:bg-white/20",
              })}
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
