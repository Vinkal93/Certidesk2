import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers, ShieldCheck, Users } from "lucide-react";
import { heroContent } from "@/config/landing";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="border-border from-surface to-background relative overflow-hidden border-b bg-gradient-to-b py-12 sm:py-16 lg:flex lg:min-h-[calc(100svh-4rem)] lg:min-h-[calc(100vh-4rem)] lg:items-center lg:py-14">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <Badge variant="primary" className="mb-5">
              {heroContent.eyebrow}
            </Badge>
            <h1 className="text-foreground text-3xl leading-[1.16] font-bold tracking-tight sm:text-5xl lg:leading-[1.12]">
              {heroContent.title}
            </h1>
            <p className="text-muted mt-4 max-w-xl text-sm leading-relaxed sm:mt-5 sm:text-lg">
              {heroContent.description}
            </p>

            <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5">
              <Link
                href={heroContent.primaryCta.href}
                className={buttonVariants({
                  variant: "primary",
                  size: "lg",
                  className: "w-full sm:w-auto",
                })}
              >
                {heroContent.primaryCta.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={heroContent.secondaryCta.href}
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "w-full sm:w-auto",
                })}
              >
                {heroContent.secondaryCta.label}
              </Link>
            </div>

            <ul className="text-muted mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm">
              {heroContent.highlights.map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2
                    className="text-success h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-foreground font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6">
            <div className="border-border bg-background rounded-2xl border p-4 shadow-xl sm:p-6">
              <div className="border-border flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-navy flex h-8 w-8 items-center justify-center rounded-lg text-white">
                    <Layers className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      Institute Operations Overview
                    </p>
                    <p className="text-muted text-xs">
                      Academic &amp; Fee Workspace Preview
                    </p>
                  </div>
                </div>
                <Badge variant="success">System Ready</Badge>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="border-border bg-surface rounded-xl border p-2.5 sm:p-3.5">
                  <p className="text-muted text-[11px] font-medium sm:text-xs">
                    Active Batches
                  </p>
                  <p className="text-foreground mt-1 text-lg font-bold sm:text-xl">14</p>
                  <p className="text-primary mt-1 text-[10px] font-medium sm:text-[11px]">
                    4 Programs
                  </p>
                </div>
                <div className="border-border bg-surface rounded-xl border p-2.5 sm:p-3.5">
                  <p className="text-muted text-[11px] font-medium sm:text-xs">
                    Attendance
                  </p>
                  <p className="text-foreground mt-1 text-lg font-bold sm:text-xl">
                    94.2%
                  </p>
                  <p className="text-success mt-1 text-[10px] font-medium sm:text-[11px]">
                    Daily Synced
                  </p>
                </div>
                <div className="border-border bg-surface rounded-xl border p-2.5 sm:p-3.5">
                  <p className="text-muted text-[11px] font-medium sm:text-xs">
                    Fee Ledger
                  </p>
                  <p className="text-foreground mt-1 text-lg font-bold sm:text-xl">
                    91.4%
                  </p>
                  <p className="text-warning mt-1 text-[10px] font-medium sm:text-[11px]">
                    8 Dues Pending
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="border-border flex items-center justify-between rounded-lg border px-3.5 py-2.5">
                  <div className="flex items-center gap-3">
                    <Users className="text-primary h-4 w-4" aria-hidden="true" />
                    <div>
                      <p className="text-foreground text-xs font-semibold">
                        Student Admissions &amp; Batch Allocation
                      </p>
                      <p className="text-muted text-[11px]">
                        Profiles, enrollment IDs &amp; faculty mapping
                      </p>
                    </div>
                  </div>
                  <Badge variant="primary">Module</Badge>
                </div>

                <div className="border-border flex items-center justify-between rounded-lg border px-3.5 py-2.5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-success h-4 w-4" aria-hidden="true" />
                    <div>
                      <p className="text-foreground text-xs font-semibold">
                        Marksheets &amp; Serialized Certificates
                      </p>
                      <p className="text-muted text-[11px]">
                        Subject-wise grading &amp; credential registry
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Verified</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
