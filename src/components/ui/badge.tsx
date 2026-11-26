import * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  "default" | "primary" | "navy" | "success" | "warning" | "danger" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-surface text-foreground border-border",
  primary: "bg-primary-soft text-primary-dark border-blue-200",
  navy: "bg-navy text-white border-navy",
  success: "bg-success-soft text-success border-emerald-200",
  warning: "bg-warning-soft text-warning border-amber-200",
  danger: "bg-danger-soft text-danger border-red-200",
  outline: "bg-transparent text-muted border-border",
};

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
