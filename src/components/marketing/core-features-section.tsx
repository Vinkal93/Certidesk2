import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  FileSpreadsheet,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { coreFeatures, type CoreFeatureItem } from "@/config/landing";
import { SectionHeader } from "@/components/layout/section-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const iconMap: Record<CoreFeatureItem["iconName"], LucideIcon> = {
  users: Users,
  bookOpen: BookOpen,
  calendarCheck: CalendarCheck,
  wallet: Wallet,
  fileSpreadsheet: FileSpreadsheet,
  award: Award,
  barChart3: BarChart3,
  building2: Building2,
};

export function CoreFeaturesSection() {
  return (
    <Section id="features" spacing="md" background="surface">
      <Container>
        <SectionHeader
          eyebrow="Core Capabilities"
          title="Everything your institute needs in one cohesive platform"
          description="Purpose-built modules designed to work together—eliminating duplicate data entry between admissions, finance, faculty, and examinations."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {coreFeatures.map((feature) => {
            const Icon = iconMap[feature.iconName];
            return (
              <Card
                key={feature.id}
                interactive
                className="flex flex-col justify-between"
              >
                <CardHeader>
                  <div className="bg-primary-soft text-primary mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="border-border text-foreground space-y-1 border-t pt-3 text-xs font-medium">
                    {feature.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-center gap-2">
                        <span
                          className="bg-primary h-1.5 w-1.5 rounded-full"
                          aria-hidden="true"
                        />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
