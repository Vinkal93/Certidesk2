import { credibilityPillars } from "@/config/landing";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export function CredibilitySection() {
  return (
    <Section spacing="sm" className="border-border bg-background border-b">
      <Container>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {credibilityPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="border-border bg-surface/60 rounded-xl border p-5"
            >
              <p className="text-primary text-xs font-semibold tracking-wider uppercase">
                {pillar.metricLabel}
              </p>
              <h3 className="text-foreground mt-2 text-base font-semibold">
                {pillar.title}
              </h3>
              <p className="text-muted mt-1.5 text-sm leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
