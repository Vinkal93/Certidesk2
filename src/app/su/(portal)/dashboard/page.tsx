import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  CreditCard,
  IndianRupee,
  Plus,
  ShieldAlert,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import {
  getSuperAdminDashboardData,
  type SuDashboardRange,
} from "@/services/su-dashboard.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Super Admin Dashboard",
  robots: { index: false, follow: false },
};

const rangeOptions: { label: string; value: SuDashboardRange }[] = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "All Time", value: "all" },
];

export default async function SuperAdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const { range: rawRange } = await searchParams;
  const range: SuDashboardRange =
    rawRange === "7d" || rawRange === "30d" || rawRange === "90d" || rawRange === "all"
      ? rawRange
      : "30d";

  const data = await getSuperAdminDashboardData(range);
  const { metrics, gatewayConfig } = data;

  const kpiCards = [
    {
      label: "Total Institutes",
      value: String(metrics.totalInstitutes),
      icon: Building2,
    },
    {
      label: "Active Institutes",
      value: String(metrics.activeInstitutes),
      icon: Building2,
    },
    {
      label: "Suspended Institutes",
      value: String(metrics.suspendedInstitutes),
      icon: ShieldAlert,
    },
    { label: "Total Students", value: String(metrics.totalStudents), icon: Users },
    { label: "Total Staff", value: String(metrics.totalStaff), icon: UserCog },
    { label: "Total Payments", value: String(metrics.totalPayments), icon: CreditCard },
    {
      label: "Live Revenue",
      value: `₹${(metrics.liveRevenuePaise / 100).toFixed(2)}`,
      icon: IndianRupee,
    },
    {
      label: "Wallet Liability",
      value: `₹${(metrics.walletLiabilityPaise / 100).toFixed(2)}`,
      icon: Wallet,
    },
    {
      label: "Pending Payments",
      value: String(metrics.pendingPaymentsCount),
      icon: Activity,
    },
    {
      label: "Failed Payments",
      value: String(metrics.failedPaymentsCount),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="border-border bg-background flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-foreground text-sm font-semibold">
            CertiDesk Pro — Platform Control Center
          </p>
          <p className="text-muted text-xs">
            Live Firestore metrics &bull; Test Simulated Revenue: ₹
            {(metrics.testRevenuePaise / 100).toFixed(2)} (separated from Live)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="border-border bg-surface flex rounded-lg border p-0.5">
            {rangeOptions.map((opt) => (
              <Link
                key={opt.value}
                href={`/su/dashboard?range=${opt.value}`}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === opt.value
                    ? "bg-navy text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
          <Link
            href="/su/institutes/new"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Register Institute
          </Link>
        </div>
      </div>

      {/* 10 Live KPI Widgets */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted text-xs font-medium">{kpi.label}</p>
                  <Icon className="text-primary h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-foreground mt-2 text-2xl font-bold tracking-tight">
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Operational Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base">Recent Institute Registrations</CardTitle>
            <Link
              href="/su/institutes"
              className="text-primary text-xs font-medium hover:underline"
            >
              All institutes
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {data.recentInstitutes.length === 0 ? (
              <p className="text-muted text-sm">No institutes registered yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.recentInstitutes.map((inst) => (
                  <Link
                    key={inst.id}
                    href={`/su/institutes/${inst.id}`}
                    className="border-border/80 bg-surface/50 hover:bg-surface flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-foreground font-medium">{inst.name}</p>
                      <p className="text-muted font-mono text-xs">
                        {inst.code} &bull; {inst.ownerName}
                      </p>
                    </div>
                    <Badge variant={inst.status === "active" ? "success" : "danger"}>
                      {inst.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base">Gateway &amp; Webhook Health</CardTitle>
            <Link
              href="/su/settings/payment-gateway/razorpay"
              className="text-primary text-xs font-medium hover:underline"
            >
              Configure
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-sm">
            <div className="border-border bg-surface grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div>
                <p className="text-muted text-xs">Gateway Status</p>
                <Badge
                  variant={gatewayConfig.enabled ? "success" : "danger"}
                  className="mt-1"
                >
                  {gatewayConfig.enabled
                    ? `Active (${gatewayConfig.activeEnvironment?.toUpperCase()})`
                    : "Disabled"}
                </Badge>
              </div>
              <div>
                <p className="text-muted text-xs">Webhooks Verified</p>
                <p className="mt-1 text-xs font-medium">
                  Test: {gatewayConfig.testWebhookVerified ? "Yes" : "No"} &bull; Live:{" "}
                  {gatewayConfig.liveWebhookVerified ? "Yes" : "No"}
                </p>
              </div>
            </div>
            {data.recentWebhooks.length === 0 ? (
              <p className="text-muted text-xs">No webhook events received yet.</p>
            ) : (
              <div className="space-y-1.5">
                {data.recentWebhooks.slice(0, 4).map((wh) => (
                  <div key={wh.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-mono">
                      [{wh.environment}] {wh.eventType}
                    </span>
                    <Badge variant={wh.status === "processed" ? "success" : "outline"}>
                      {wh.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base">Recent Wallet Recharges</CardTitle>
            <Link
              href="/su/wallets"
              className="text-primary text-xs font-medium hover:underline"
            >
              Wallet ledger
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {data.recentWalletRecharges.length === 0 ? (
              <p className="text-muted text-sm">No wallet credits recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recentWalletRecharges.map((tx) => (
                  <div
                    key={tx.id}
                    className="border-border/80 bg-surface/50 flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-mono font-medium">{tx.instituteId}</p>
                      <p className="text-muted">{tx.reason}</p>
                    </div>
                    <span className="text-success font-semibold">
                      +₹{(tx.amountPaise / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-base">Recent Audit Events</CardTitle>
            <Link
              href="/su/audit-logs"
              className="text-primary text-xs font-medium hover:underline"
            >
              View logs
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {data.recentAudits.length === 0 ? (
              <p className="text-muted text-sm">No audit events recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recentAudits.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="border-border/80 bg-surface/50 flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                  >
                    <span className="font-mono font-medium">{log.action}</span>
                    <span className="text-muted">
                      {log.actorRole} &bull; {log.createdAt.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
