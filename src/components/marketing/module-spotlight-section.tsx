import { CheckCircle2 } from "lucide-react";
import type { ModuleSpotlight } from "@/config/landing";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";

export interface ModuleSpotlightSectionProps {
  spotlight: ModuleSpotlight;
  reverse?: boolean;
  background?: "default" | "surface";
}

export function ModuleSpotlightSection({
  spotlight,
  reverse = false,
  background = "default",
}: ModuleSpotlightSectionProps) {
  return (
    <Section
      id={spotlight.id}
      spacing="sm"
      background={background}
      className="border-border/70 border-b"
    >
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className={cn("lg:col-span-6", reverse && "lg:order-2")}>
            <Badge variant="primary">{spotlight.eyebrow}</Badge>
            <h2 className="text-foreground mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {spotlight.title}
            </h2>
            <p className="text-muted mt-3 text-base leading-relaxed">
              {spotlight.description}
            </p>
            <ul className="mt-6 space-y-3">
              {spotlight.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="text-foreground flex items-start gap-2.5 text-sm"
                >
                  <CheckCircle2
                    className="text-primary mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={cn("lg:col-span-6", reverse && "lg:order-1")}>
            <div className="border-border bg-background rounded-xl border p-5 shadow-sm">
              <div className="border-border flex items-center justify-between border-b pb-3.5">
                <p className="text-foreground text-sm font-semibold">
                  {spotlight.previewTitle}
                </p>
                <Badge variant="outline">{spotlight.previewBadge}</Badge>
              </div>
              <div className="mt-4 space-y-2.5">
                {spotlight.previewRows.map((row) => (
                  <div
                    key={row.label}
                    className="border-border/80 bg-surface/60 flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-medium">
                        {row.label}
                      </p>
                      <p className="text-muted truncate text-xs">{row.meta}</p>
                    </div>
                    <Badge variant={row.tone}>{row.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
