import * as React from "react";
import { cn } from "@/lib/cn";

export type SectionSpacing = "sm" | "md" | "lg";
export type SectionBackground = "default" | "surface" | "navy";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: SectionSpacing;
  background?: SectionBackground;
}

const spacingClasses: Record<SectionSpacing, string> = {
  sm: "py-12 sm:py-16",
  md: "py-16 sm:py-20 lg:py-24",
  lg: "py-20 sm:py-24 lg:py-28",
};

const backgroundClasses: Record<SectionBackground, string> = {
  default: "bg-background text-foreground",
  surface: "bg-surface text-foreground",
  navy: "bg-navy text-white",
};

export function Section({
  spacing = "md",
  background = "default",
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(spacingClasses[spacing], backgroundClasses[background], className)}
      {...props}
    >
      {children}
    </section>
  );
}
