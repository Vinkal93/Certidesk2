import { workflowSteps } from "@/config/landing";
import { SectionHeader } from "@/components/layout/section-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export function WorkflowSection() {
  return (
    <Section id="workflow" spacing="md" className="border-border border-b">
      <Container>
        <SectionHeader
          eyebrow="Institute Workflow"
          title="A clear lifecycle from student admission to certification"
          description="Every stage feeds cleanly into the next so administrators, teachers, and finance teams always work from the same up-to-date records."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((item) => (
            <div
              key={item.step}
              className="border-border bg-surface/50 relative rounded-xl border p-6"
            >
              <span className="bg-navy inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white">
                {item.step}
              </span>
              <h3 className="text-foreground mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
