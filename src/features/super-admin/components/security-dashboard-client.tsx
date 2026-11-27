"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Download,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SecurityDashboardInitialData {
  dataFreshnessAt: string;
  metrics: {
    successfulLogins: number;
    failedLogins: number;
    blockedLogins: number;
    activeSessions: number;
    revokedSessions: number;
    expiredSessions: number;
    openAlerts: number;
    criticalAlerts: number;
    rejectedWebhooks: number;
    trackedAuthEvents: number;
    activeUsersTracked: number;
    superAdminCount: number;
    mfaEnrolledSuperAdmins: number | null;
    mfaMissingSuperAdmins: string[];
    latestEventAt: string | null;
  };
  loginTrend: Array<{ date: string; success: number; failed: number }>;
  alertSeverityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  policy: {
    sessionLifetimeDays: number;
    idleTimeoutMinutes: number;
    requireSuperAdminMfa: boolean;
  };
}

export function SecurityDashboardClient({
  initialData,
}: {
  initialData: SecurityDashboardInitialData;
}) {
  const [data, setData] = React.useState(initialData);
  const [windowFilter, setWindowFilter] = React.useState("30d");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [loading, setLoading] = React.useState(false);

  const refresh = async (nextWindow = windowFilter, nextRole = roleFilter) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/su/security/overview?window=${encodeURIComponent(nextWindow)}&role=${encodeURIComponent(nextRole)}`
      );
      const json = (await res.json()) as {
        ok: boolean;
        data?: SecurityDashboardInitialData;
      };
      if (res.ok && json.ok && json.data) {
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const exportSummaryCsv = () => {
    const rows = [
      ["Metric", "Value", "Source", "Window"],
      [
        "Successful Logins",
        String(data.metrics.successfulLogins),
        "securityLoginEvents",
        windowFilter,
      ],
      [
        "Failed Logins",
        String(data.metrics.failedLogins),
        "securityLoginEvents",
        windowFilter,
      ],
      [
        "Blocked Logins",
        String(data.metrics.blockedLogins),
        "securityLoginEvents",
        windowFilter,
      ],
      [
        "Active Sessions",
        String(data.metrics.activeSessions),
        "securitySessions",
        "live",
      ],
      [
        "Revoked Sessions",
        String(data.metrics.revokedSessions),
        "securitySessions",
        "live",
      ],
      [
        "Expired Sessions",
        String(data.metrics.expiredSessions),
        "securitySessions",
        "live",
      ],
      ["Open Security Alerts", String(data.metrics.openAlerts), "securityAlerts", "live"],
      ["Critical Alerts", String(data.metrics.criticalAlerts), "securityAlerts", "live"],
      [
        "Rejected Webhooks",
        String(data.metrics.rejectedWebhooks),
        "webhook_events",
        "recent",
      ],
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-posture-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const m = data.metrics;
  const maxTrendVal = Math.max(
    1,
    ...data.loginTrend.map((t) => Math.max(t.success, t.failed))
  );

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Security Command Center
          </h1>
          <p className="text-muted mt-1 text-xs">
            Freshness:{" "}
            <span className="font-mono">
              {data.dataFreshnessAt.slice(0, 19).replace("T", " ")} UTC
            </span>
            {m.latestEventAt
              ? ` · Latest event: ${m.latestEventAt.slice(0, 19).replace("T", " ")}`
              : " · No login events recorded yet"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Time window"
            value={windowFilter}
            onChange={(e) => {
              setWindowFilter(e.target.value);
              refresh(e.target.value, roleFilter);
            }}
            className="border-border bg-background h-9 rounded-lg border px-2.5 text-xs"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>

          <select
            aria-label="Role filter"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              refresh(windowFilter, e.target.value);
            }}
            className="border-border bg-background h-9 rounded-lg border px-2.5 text-xs"
          >
            <option value="all">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="institute_admin">Institute Admin</option>
            <option value="staff">Staff</option>
            <option value="student">Student</option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={loading}
            onClick={() => refresh()}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportSummaryCsv}
            leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Successful Logins</p>
            <p className="text-foreground mt-1 font-mono text-2xl font-bold">
              {m.successfulLogins}
            </p>
            <p className="text-muted mt-1 text-[11px]">
              Source: securityLoginEvents ({windowFilter})
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Failed / Blocked Logins</p>
            <p
              className={`mt-1 font-mono text-2xl font-bold ${
                m.failedLogins + m.blockedLogins > 0 ? "text-danger" : "text-foreground"
              }`}
            >
              {m.failedLogins} / {m.blockedLogins}
            </p>
            <p className="text-muted mt-1 text-[11px]">
              Source: securityLoginEvents ({windowFilter})
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">
              Sessions (Active / Revoked / Expired)
            </p>
            <p className="text-foreground mt-1 font-mono text-2xl font-bold">
              {m.activeSessions} / {m.revokedSessions} / {m.expiredSessions}
            </p>
            <p className="text-muted mt-1 text-[11px]">Source: securitySessions (live)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Open Alerts (Critical)</p>
            <p
              className={`mt-1 font-mono text-2xl font-bold ${
                m.criticalAlerts > 0 ? "text-danger" : "text-foreground"
              }`}
            >
              {m.openAlerts} ({m.criticalAlerts})
            </p>
            <p className="text-muted mt-1 text-[11px]">
              Rejected webhooks: {m.rejectedWebhooks}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Posture & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="text-primary h-4 w-4" aria-hidden="true" />
              Login Success vs Failure Trend (Daily)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.loginTrend.length === 0 ? (
              <p className="text-muted py-6 text-center text-sm">
                Insufficient data — no login events recorded in this time window.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.loginTrend.map((row) => (
                  <div key={row.date} className="space-y-1 text-xs">
                    <div className="flex justify-between font-mono">
                      <span className="text-muted">{row.date}</span>
                      <span>
                        <span className="text-success font-semibold">
                          {row.success} ok
                        </span>
                        {" · "}
                        <span className="text-danger font-semibold">
                          {row.failed} fail
                        </span>
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${(row.success / maxTrendVal) * 100}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ width: `${(row.failed / maxTrendVal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="text-primary h-4 w-4" aria-hidden="true" />
              Security Posture &amp; MFA Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="border-border flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">Super Admin MFA Enrollment</span>
              {m.mfaEnrolledSuperAdmins === null ? (
                <Badge variant="outline">Data unavailable</Badge>
              ) : m.mfaMissingSuperAdmins.length > 0 ? (
                <Badge variant="danger">
                  {m.mfaEnrolledSuperAdmins}/{m.superAdminCount} enrolled (
                  {m.mfaMissingSuperAdmins.length} missing)
                </Badge>
              ) : (
                <Badge variant="success">
                  {m.mfaEnrolledSuperAdmins}/{m.superAdminCount} enrolled
                </Badge>
              )}
            </div>

            {m.mfaMissingSuperAdmins.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
                <p className="font-semibold">Accounts Missing MFA:</p>
                <p className="mt-1 font-mono">{m.mfaMissingSuperAdmins.join(", ")}</p>
              </div>
            )}

            <div className="border-border flex items-center justify-between rounded-lg border p-3">
              <span>Session Lifetime / Idle Timeout</span>
              <span className="font-mono font-medium">
                {data.policy.sessionLifetimeDays}d / {data.policy.idleTimeoutMinutes}m
              </span>
            </div>

            <div className="border-border grid grid-cols-2 gap-2 pt-2">
              <Link
                href="/su/security/alerts"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Review Alerts
              </Link>
              <Link
                href="/su/security/sessions"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Manage Sessions
              </Link>
              <Link
                href="/su/security/logins"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                Login Activity
              </Link>
              <Link
                href="/su/settings/security"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Access Control
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
