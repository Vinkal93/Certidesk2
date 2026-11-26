"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { faqItems } from "@/config/landing";
import { cn } from "@/lib/cn";
import { SectionHeader } from "@/components/layout/section-header";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <Section id="faq" spacing="md" className="border-border border-b">
      <Container size="md">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Clear answers about institute setup, multi-branch capabilities, fees, marksheets, and certificates."
        />

        <div className="divide-border border-border bg-background mt-10 divide-y rounded-2xl border">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <div key={item.question} className="px-6 py-5">
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
                >
                  <span className="text-foreground text-base font-semibold">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "text-muted h-5 w-5 shrink-0 transition-transform duration-200",
                      isOpen && "text-primary rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="text-muted mt-3 pr-8 text-sm leading-relaxed"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
