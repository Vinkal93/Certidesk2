"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Database,
  HardDrive,
  Lock,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  EmergencyAuditRecord,
  HealthCheckSample,
  MaintenanceEventRecord,
  PlatformLockdownRecord,
  ServiceRestrictionRecord,
} from "@/types/emergency";
import {
  EmergencyHeaderBar,
  HealthStatusBadge,
  formatEmergencyDate,
} from "./emergency-shared";

export interface EmergencyDashboardPayload {
  checkedAt: string;
  health: HealthCheckSample;
  healthSeries: HealthCheckSample[];
  kpis: {
    activeIncidents: number;
    criticalIncidents: number;
    servicesDegraded: number;
    institutesAffected: number;
    globalAffected: boolean;
    activeRestrictions: number;
    maintenanceEvents: number;
    scheduledMaintenances: number;
    recoveryOperations: number;
    failedOperations: number;
  };
  analytics: {
    bySeverity: Record<"critical" | "high" | "medium" | "low" | "info", number>;
    byStatus: Record<string, number>;
    mttaMinutes: number | null;
    mttrMinutes: number | null;
    totalIncidents: number;
  };
  activeStateSummary: {
    activeMaintenances: MaintenanceEventRecord[];
    activeLockdowns: PlatformLockdownRecord[];
    activeRestrictions: ServiceRestrictionRecord[];
  };
  audits: EmergencyAuditRecord[];
}

export function EmergencyDashboardClient({
  initialData,
}: {
  initialData: EmergencyDashboardPayload;
}) {
  const [data, setData] = useState<EmergencyDashboardPayload>(initialData);
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "custom">("24h");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function fetchOverview(targetRange = range) {
    setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range: targetRange });
      if (targetRange === "custom" && customFrom) params.set("from", customFrom);
      if (targetRange === "custom" && customTo) params.set("to", customTo);
      const res = await fetch(`/api/su/emergency/overview?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        data?: EmergencyDashboardPayload;
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? "Failed to refresh emergency overview.");
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh overview.");
    } finally {
      setRefreshing(false);
    }
  }

  // Periodic live polling every 45s
  useEffect(() => {
    const id = setInterval(() => {
      void fetchOverview(range);
    }, 45_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const kpiCards = [
    {
      label: "Active Incidents",
      value: data.kpis.activeIncidents,
      href: "/su/emergency/incidents",
      tone: data.kpis.activeIncidents > 0 ? "text-amber-600" : "text-foreground",
      sub: `${data.analytics.totalIncidents} total recorded`,
    },
    {
      label: "Critical Incidents",
      value: data.kpis.criticalIncidents,
      href: "/su/emergency/incidents?severity=critical",
      tone: data.kpis.criticalIncidents > 0 ? "text-red-600" : "text-foreground",
      sub: "Immediate SRE attention",
    },
    {
      label: "Services Degraded",
      value: data.kpis.servicesDegraded,
      href: "/su/emergency/restrictions",
      tone: data.kpis.servicesDegraded > 0 ? "text-red-600" : "text-emerald-600",
      sub: "Live health probes",
    },
    {
      label: "Institutes Affected",
      value: data.kpis.institutesAffected,
      href: "/su/emergency/lockdown",
      tone: data.kpis.institutesAffected > 0 ? "text-amber-600" : "text-foreground",
      sub: data.kpis.globalAffected ? "Global policy active" : "Scoped impact",
    },
    {
      label: "Active Restrictions",
      value: data.kpis.activeRestrictions,
      href: "/su/emergency/restrictions",
      tone: data.kpis.activeRestrictions > 0 ? "text-amber-600" : "text-foreground",
      sub: "Module & operation controls",
    },
    {
      label: "Maintenance Events",
      value: data.kpis.maintenanceEvents,
      href: "/su/emergency/maintenance",
      tone: data.kpis.maintenanceEvents > 0 ? "text-amber-600" : "text-foreground",
      sub: `${data.kpis.scheduledMaintenances} scheduled`,
    },
    {
      label: "Recovery Operations",
      value: data.kpis.recoveryOperations,
      href: "/su/emergency/recovery",
      tone: "text-foreground",
      sub: "Audited restoration workflows",
    },
    {
      label: "Failed Operations",
      value: data.kpis.failedOperations,
      href: "/su/emergency/recovery",
      tone: data.kpis.failedOperations > 0 ? "text-red-600" : "text-foreground",
      sub: "Failed recoveries or actions",
    },
  ];

  const filteredAudits = data.audits.filter((a) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      a.action.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q) ||
      a.targetId.toLowerCase().includes(q)
    );
  });

  const svcRows = [
    {
      name: "Application Runtime",
      status: data.health.services.application.status,
      detail: `${data.health.services.application.latencyMs} ms response`,
      icon: Activity,
    },
    {
      name: "Firebase Authentication",
      status: data.health.services.authentication.status,
      detail: `${data.health.services.authentication.latencyMs} ms probe`,
      icon: Lock,
    },
    {
      name: "Cloud Firestore",
      status: data.health.services.firestore.status,
      detail: `${data.health.services.firestore.latencyMs} ms query`,
      icon: Database,
    },
    {
      name: "Razorpay Gateway",
      status: data.health.services.razorpay.status,
      detail: data.health.services.razorpay.detail,
      icon: CheckCircle2,
    },
    {
      name: "Notifications Channel",
      status: data.health.services.notifications.status,
      detail: data.health.services.notifications.detail,
      icon: AlertTriangle,
    },
    {
      name: "Backup Infrastructure",
      status: data.health.services.backups.status,
      detail: data.health.services.backups.detail,
      icon: HardDrive,
    },
  ];

  const maxLatency = Math.max(
    100,
    ...data.healthSeries.map((s) =>
      Math.max(s.services.authentication.latencyMs, s.services.firestore.latencyMs)
    )
  );

  return (
    <div className="space-y-6">
      <EmergencyHeaderBar
        title="Emergency Operations Center"
        description="Real-time platform health, active emergency policies, incident analytics, and audited recovery controls."
        overallStatus={data.health.overallStatus}
        checkedAt={data.checkedAt}
        refreshing={refreshing}
        onRefresh={() => void fetchOverview(range)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/su/emergency/incidents"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              Declare Incident
            </Link>
            <Link
              href="/su/emergency/maintenance"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Maintenance Mode
            </Link>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Active Emergency Banner */}
      {(data.activeStateSummary.activeLockdowns.length > 0 ||
        data.activeStateSummary.activeMaintenances.length > 0) && (
        <div className="rounded-xl border border-red-300 bg-red-50/70 p-4 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Active Emergency Policy Enforced
                </p>
                <p className="text-xs text-red-800 dark:text-red-300">
                  {data.activeStateSummary.activeLockdowns.length} active lockdown(s) and{" "}
                  {data.activeStateSummary.activeMaintenances.length} active maintenance
                  window(s) are currently enforced on non-Super-Admin portals.
                </p>
              </div>
            </div>
            <Link
              href="/su/emergency/recovery"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open Recovery Center
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 8 Real KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="group block">
            <Card className="transition-colors group-hover:border-blue-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-muted text-xs font-medium">{kpi.label}</p>
                  <ArrowRight className="text-muted h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className={`mt-2 text-2xl font-bold tracking-tight ${kpi.tone}`}>
                  {kpi.value}
                </p>
                <p className="text-muted mt-1 text-xs">{kpi.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Live Infrastructure & Policy Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Live Platform & Integration Health
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-border divide-y">
            {svcRows.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.name}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-surface text-muted flex h-8 w-8 items-center justify-center rounded-lg">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-medium">{svc.name}</p>
                      <p className="text-muted text-xs">{svc.detail}</p>
                    </div>
                  </div>
                  <HealthStatusBadge status={svc.status} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions & Active Controls */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Operational Workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link
              href="/su/emergency/incidents"
              className="border-border hover:bg-surface flex items-center justify-between rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-foreground text-sm font-medium">Create Incident</p>
                  <p className="text-muted text-xs">
                    Declare and assign a tracked platform incident
                  </p>
                </div>
              </div>
              <ArrowRight className="text-muted h-4 w-4" />
            </Link>

            <Link
              href="/su/emergency/maintenance"
              className="border-border hover:bg-surface flex items-center justify-between rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Open Maintenance Mode
                  </p>
                  <p className="text-muted text-xs">
                    {data.kpis.maintenanceEvents} active &bull;{" "}
                    {data.kpis.scheduledMaintenances} scheduled
                  </p>
                </div>
              </div>
              <ArrowRight className="text-muted h-4 w-4" />
            </Link>

            <Link
              href="/su/emergency/lockdown"
              className="border-border hover:bg-surface flex items-center justify-between rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    View Platform Lockdown
                  </p>
                  <p className="text-muted text-xs">
                    {data.activeStateSummary.activeLockdowns.length} active lockdown(s)
                  </p>
                </div>
              </div>
              <ArrowRight className="text-muted h-4 w-4" />
            </Link>

            <Link
              href="/su/emergency/restrictions"
              className="border-border hover:bg-surface flex items-center justify-between rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Ban className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    View Service Restrictions
                  </p>
                  <p className="text-muted text-xs">
                    {data.kpis.activeRestrictions} module restriction(s) active
                  </p>
                </div>
              </div>
              <ArrowRight className="text-muted h-4 w-4" />
            </Link>

            <Link
              href="/su/emergency/recovery"
              className="border-border hover:bg-surface flex items-center justify-between rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Start Recovery Assessment
                  </p>
                  <p className="text-muted text-xs">
                    Verified service restoration &amp; live probes
                  </p>
                </div>
              </div>
              <ArrowRight className="text-muted h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Platform Health Time-Series + Incident Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                Sampled Health &amp; Latency History
              </CardTitle>
              <p className="text-muted text-xs">
                Actual recorded probes from operational_health_checks (never synthetic).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["24h", "7d", "30d", "custom"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRange(r);
                    if (r !== "custom") void fetchOverview(r);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {range === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-auto text-xs"
                />
                <Input
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-auto text-xs"
                />
                <button
                  type="button"
                  onClick={() => void fetchOverview("custom")}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Apply Range
                </button>
              </div>
            )}

            {data.healthSeries.length === 0 ? (
              <div className="border-border rounded-lg border border-dashed p-8 text-center text-xs text-slate-500">
                No historical probe samples in this window yet. Samples are recorded
                automatically as health checks run.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex h-36 items-end gap-1.5 overflow-x-auto pt-2">
                  {data.healthSeries.slice(-30).map((sample) => {
                    const dbMs = sample.services.firestore.latencyMs;
                    const pct = Math.max(8, Math.min(100, (dbMs / maxLatency) * 100));
                    const barColor =
                      sample.overallStatus === "healthy"
                        ? "bg-emerald-500"
                        : sample.overallStatus === "degraded"
                          ? "bg-amber-500"
                          : "bg-red-500";
                    return (
                      <div
                        key={sample.id}
                        title={`${formatEmergencyDate(sample.checkedAt)} — ${sample.overallStatus} (Firestore ${dbMs}ms, Auth ${sample.services.authentication.latencyMs}ms)`}
                        className="flex min-w-[10px] flex-1 flex-col items-center justify-end gap-1"
                      >
                        <div
                          className={`w-full rounded-t ${barColor}`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="text-muted flex items-center justify-between text-[11px]">
                  <span>{formatEmergencyDate(data.healthSeries[0]?.checkedAt)}</span>
                  <span>
                    {data.healthSeries.length} sample(s) &bull; Latest Firestore:{" "}
                    {data.health.services.firestore.latencyMs}ms
                  </span>
                  <span>
                    {formatEmergencyDate(
                      data.healthSeries[data.healthSeries.length - 1]?.checkedAt
                    )}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Incident Analytics &amp; SLA Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="border-border bg-surface rounded-lg border p-3">
                <p className="text-muted text-[11px] font-medium uppercase">MTTA</p>
                <p className="text-foreground mt-1 text-lg font-bold">
                  {data.analytics.mttaMinutes !== null
                    ? `${data.analytics.mttaMinutes} min`
                    : "No ack data"}
                </p>
              </div>
              <div className="border-border bg-surface rounded-lg border p-3">
                <p className="text-muted text-[11px] font-medium uppercase">MTTR</p>
                <p className="text-foreground mt-1 text-lg font-bold">
                  {data.analytics.mttrMinutes !== null
                    ? `${data.analytics.mttrMinutes} min`
                    : "No resolved data"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-muted text-xs font-semibold uppercase">By Severity</p>
              {(["critical", "high", "medium", "low", "info"] as const).map((sev) => {
                const count = data.analytics.bySeverity[sev];
                const pct =
                  data.analytics.totalIncidents > 0
                    ? Math.round((count / data.analytics.totalIncidents) * 100)
                    : 0;
                return (
                  <div key={sev} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground capitalize">{sev}</span>
                      <span className="text-muted font-mono">{count}</span>
                    </div>
                    <div className="bg-surface h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className={`h-full ${
                          sev === "critical"
                            ? "bg-red-600"
                            : sev === "high"
                              ? "bg-amber-500"
                              : sev === "medium"
                                ? "bg-blue-500"
                                : "bg-slate-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Activity Timeline */}
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Operational Activity Timeline</CardTitle>
            <p className="text-muted text-xs">
              Immutable audit trail across maintenance, lockdowns, restrictions,
              incidents, and recoveries.
            </p>
          </div>
          <Input
            placeholder="Filter audit action, target, or reason..."
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            className="sm:w-72"
          />
        </CardHeader>
        <CardContent>
          {filteredAudits.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">
              No emergency audit records match your filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border text-muted border-b uppercase">
                  <tr>
                    <th className="py-2.5 pr-4">Timestamp</th>
                    <th className="py-2.5 pr-4">Action</th>
                    <th className="py-2.5 pr-4">Target</th>
                    <th className="py-2.5 pr-4">Reason</th>
                    <th className="py-2.5">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {filteredAudits.slice(0, 20).map((a) => (
                    <tr key={a.id}>
                      <td className="text-muted py-2.5 pr-4 font-mono whitespace-nowrap">
                        {formatEmergencyDate(a.createdAt)}
                      </td>
                      <td className="text-foreground py-2.5 pr-4 font-medium">
                        {a.action}
                      </td>
                      <td className="text-muted py-2.5 pr-4 font-mono">{a.targetId}</td>
                      <td className="text-foreground py-2.5 pr-4">{a.reason}</td>
                      <td className="py-2.5">
                        <Badge variant={a.result === "success" ? "success" : "danger"}>
                          {a.result}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
