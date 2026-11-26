import { Check } from "lucide-react";
import { solutionsList } from "@/config/landing";
import { SectionHeader } from "@/components/layout/section-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SolutionsSection() {
  return (
    <Section id="solutions" spacing="md" className="border-border border-b">
      <Container>
        <SectionHeader
          eyebrow="Solutions"
          title="Tailored for every type of educational and training institute"
          description="Whether you run intensive exam coaching, technical lab cohorts, or a multi-branch skill network, CertiDesk adapts to your academic structure."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {solutionsList.map((solution) => (
            <Card key={solution.title} interactive>
              <CardHeader>
                <p className="text-primary text-xs font-semibold tracking-wider uppercase">
                  {solution.subtitle}
                </p>
                <CardTitle className="mt-1 text-xl">{solution.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted text-sm leading-relaxed">
                  {solution.description}
                </p>
                <ul className="border-border space-y-2 border-t pt-4">
                  {solution.capabilities.map((capability) => (
                    <li
                      key={capability}
                      className="text-foreground flex items-center gap-2.5 text-sm font-medium"
                    >
                      <Check
                        className="text-success h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      {capability}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
