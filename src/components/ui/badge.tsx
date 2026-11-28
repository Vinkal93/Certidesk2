import * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  "default" | "primary" | "navy" | "success" | "warning" | "danger" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default:
    "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700",
  primary:
    "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-700/80",
  navy: "bg-slate-900 text-white border-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
  success:
    "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700/80",
  warning:
    "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700/80",
  danger:
    "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-200 dark:border-red-700/80",
  outline:
    "bg-background text-slate-800 border-slate-300 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-700",
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
