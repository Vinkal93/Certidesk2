import * as React from "react";
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock5,
  ScanSearch,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "default"
  | "primary"
  | "navy"
  | "success"
  | "warning"
  | "danger"
  | "outline"
  | "pending"
  | "failed"
  | "in_progress"
  | "in_review"
  | "expired"
  | "submitted";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  withIcon?: boolean;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default:
    "bg-zinc-100 text-[#52525b] border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700",
  primary:
    "bg-sky-100/90 text-[#0066CC] border-sky-200/80 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800/70",
  navy: "bg-slate-900 text-white border-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
  success:
    "bg-emerald-50 text-[#15803d] border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70",
  warning:
    "bg-orange-50 text-[#b45309] border-orange-200/80 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800/70",
  danger:
    "bg-rose-50 text-[#be123c] border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/70",
  outline:
    "bg-background text-slate-800 border-slate-300 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-700",
  pending:
    "bg-orange-50 text-[#c26d1f] border-orange-200/80 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800/70",
  failed:
    "bg-rose-50 text-[#be3e2e] border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/70",
  in_progress:
    "bg-sky-100/90 text-[#0070d1] border-sky-200/80 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800/70",
  in_review:
    "bg-yellow-50 text-[#a16207] border-yellow-200/80 dark:bg-yellow-950/70 dark:text-yellow-300 dark:border-yellow-800/70",
  expired:
    "bg-zinc-100 text-[#52525b] border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700",
  submitted:
    "bg-violet-50 text-[#6C3CF0] border-violet-200/80 dark:bg-violet-950/70 dark:text-violet-300 dark:border-violet-800/70",
};

const ICON_VARIANTS = new Set<BadgeVariant>([
  "pending",
  "failed",
  "in_progress",
  "in_review",
  "expired",
  "submitted",
]);

function renderVariantIcon(variant: BadgeVariant) {
  const iconClass = "h-3.5 w-3.5 shrink-0";
  switch (variant) {
    case "success":
      return <CircleCheck className={iconClass} strokeWidth={2.5} aria-hidden="true" />;
    case "warning":
    case "pending":
      return <TriangleAlert className={iconClass} strokeWidth={2.5} aria-hidden="true" />;
    case "danger":
    case "failed":
      return <CircleX className={iconClass} strokeWidth={2.5} aria-hidden="true" />;
    case "primary":
    case "in_progress":
      return <CircleDashed className={iconClass} strokeWidth={2.5} aria-hidden="true" />;
    case "in_review":
      return <ScanSearch className={iconClass} strokeWidth={2.5} aria-hidden="true" />;
    case "expired":
    case "submitted":
      return <Clock5 className={iconClass} strokeWidth={2.5} aria-hidden="true" />;
    default:
      return null;
  }
}

export function Badge({
  variant = "default",
  withIcon,
  className,
  children,
  ...props
}: BadgeProps) {
  const showIcon = withIcon ?? ICON_VARIANTS.has(variant);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {showIcon ? renderVariantIcon(variant) : null}
      {children}
    </span>
  );
}

const STATUS_TO_VARIANT: Array<{ match: RegExp; variant: BadgeVariant }> = [
  {
    match:
      /^(active|paid|pass|passed|present|published|results_declared|success|verified|completed|resolved_paid)$/i,
    variant: "success",
  },
  { match: /^(in_progress|upcoming|processing|scheduled)$/i, variant: "in_progress" },
  { match: /^(in_review|ready_for_review|review|partial|leave)$/i, variant: "in_review" },
  { match: /^(submitted|auto_submitted|sent|delivered)$/i, variant: "submitted" },
  { match: /^(pending|due|warning|disabled|snoozed)$/i, variant: "pending" },
  {
    match: /^(failed|fail|overdue|absent|cancelled|deleted|rejected|error)$/i,
    variant: "failed",
  },
  { match: /^(expired|archived|draft|closed|inactive|dismissed)$/i, variant: "expired" },
];

export function resolveStatusBadgeVariant(status: string): BadgeVariant {
  const normalized = status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const found = STATUS_TO_VARIANT.find((item) => item.match.test(normalized));
  return found?.variant ?? "default";
}

export function StatusChip({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const variant = resolveStatusBadgeVariant(status);
  return (
    <Badge variant={variant} withIcon className={className}>
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
