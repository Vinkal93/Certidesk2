import Link from "next/link";
import { ArrowRight, Info, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

export type InsightTrendTone = "positive" | "negative" | "neutral";

export interface InsightCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  infoText?: string;
  trendText?: string;
  trendDirection?: "up" | "down" | "flat";
  trendTone?: InsightTrendTone;
  sparkline?: number[];
  detailsHref?: string;
  detailsLabel?: string;
  className?: string;
}

function buildSparklinePoints(values: number[]): string {
  if (values.length === 0) return "0,34 100,34";
  if (values.length === 1) return "0,22 100,22";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, idx) => {
      const x = (idx / (values.length - 1)) * 100;
      const y = 32 - ((v - min) / range) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function InsightCard({
  title,
  subtitle = "Last 7 days",
  value,
  infoText,
  trendText,
  trendDirection = "flat",
  trendTone = "neutral",
  sparkline,
  detailsHref,
  detailsLabel = "View Details",
  className,
}: InsightCardProps) {
  const strokeColor =
    trendTone === "positive"
      ? "var(--color-success)"
      : trendTone === "negative"
        ? "var(--color-danger)"
        : "var(--color-muted)";

  const boxBg =
    trendTone === "positive"
      ? "bg-emerald-50/70 dark:bg-emerald-950/40"
      : trendTone === "negative"
        ? "bg-red-50/70 dark:bg-red-950/40"
        : "bg-slate-100 dark:bg-slate-800/60";

  const trendColor =
    trendTone === "positive"
      ? "text-success"
      : trendTone === "negative"
        ? "text-danger"
        : "text-muted";

  const points = buildSparklinePoints(sparkline ?? []);

  return (
    <div
      className={cn(
        "border-border bg-background flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-shadow duration-150 hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-foreground truncate text-sm font-semibold">{title}</h3>
            {infoText ? (
              <span title={infoText} className="text-muted inline-flex cursor-help">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            ) : null}
          </div>
          <p className="text-muted mt-0.5 text-xs">{subtitle}</p>
          <p className="text-foreground mt-4 text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
        </div>

        <div
          className={cn(
            "flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1.5",
            boxBg
          )}
          aria-hidden="true"
        >
          <svg viewBox="0 0 100 40" className="h-full w-full overflow-visible">
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 pt-1 text-xs">
        {trendText ? (
          <span className={cn("inline-flex items-center gap-1 font-medium", trendColor)}>
            {trendDirection === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : trendDirection === "down" ? (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : null}
            {trendText}
          </span>
        ) : (
          <span />
        )}

        {detailsHref ? (
          <Link
            href={detailsHref}
            className="text-primary hover:text-primary-dark inline-flex items-center gap-1 font-medium transition-colors"
          >
            {detailsLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
