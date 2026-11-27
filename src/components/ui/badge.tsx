import * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  "default" | "primary" | "navy" | "success" | "warning" | "danger" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-surface text-foreground border-border",
  primary: "bg-primary-soft text-primary border-blue-200/80",
  navy: "bg-navy text-white border-navy",
  success: "bg-success-soft text-emerald-700 border-emerald-200/80",
  warning: "bg-warning-soft text-amber-700 border-amber-200/80",
  danger: "bg-danger-soft text-danger border-red-200/80",
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
