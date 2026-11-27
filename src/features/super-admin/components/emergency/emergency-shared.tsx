"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServiceHealthStatus } from "@/types/emergency";

export function HealthStatusBadge({
  status,
  label,
}: {
  status: ServiceHealthStatus;
  label?: string;
}) {
  const map: Record<
    ServiceHealthStatus,
    { variant: "success" | "warning" | "danger" | "outline"; text: string }
  > = {
    healthy: { variant: "success", text: label ?? "Healthy" },
    degraded: { variant: "warning", text: label ?? "Degraded" },
    unavailable: { variant: "danger", text: label ?? "Unavailable" },
    unknown: { variant: "outline", text: label ?? "Unknown" },
    not_configured: { variant: "outline", text: label ?? "Not Configured" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.text}</Badge>;
}

export function formatEmergencyDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function EmergencyHeaderBar({
  title,
  description,
  overallStatus,
  checkedAt,
  refreshing,
  onRefresh,
  actions,
}: {
  title: string;
  description: string;
  overallStatus?: ServiceHealthStatus;
  checkedAt?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {overallStatus && <HealthStatusBadge status={overallStatus} />}
        </div>
        <p className="text-muted text-sm">{description}</p>
        {checkedAt && (
          <p className="text-muted text-xs">
            Last verified:{" "}
            <span className="text-foreground font-mono">
              {formatEmergencyDate(checkedAt)}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {refreshing ? "Checking..." : "Refresh"}
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
