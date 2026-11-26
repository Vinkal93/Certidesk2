"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  KeyRound,
  Power,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  GatewayConfigHistoryRecord,
  GatewayConnectionState,
  GatewayEnvironment,
  WebhookEventRecord,
} from "@/types/payment";

export interface SafeGatewayOverviewData {
  provider: string;
  enabled: boolean;
  activeEnvironment: GatewayEnvironment | null;
  testStatus: GatewayConnectionState;
  liveStatus: GatewayConnectionState;
  testConfigured: boolean;
  liveConfigured: boolean;
  maskedTestKeyId: string | null;
  maskedLiveKeyId: string | null;
  testWebhookConfigured: boolean;
  liveWebhookConfigured: boolean;
  testWebhookVerified: boolean;
  liveWebhookVerified: boolean;
  testPaymentFlowVerified: boolean;
  livePaymentFlowVerified: boolean;
  liveMerchantApproved: boolean;
  lastTestConnectionAt: string | null;
  lastLiveConnectionAt: string | null;
  lastTestWebhookAt: string | null;
  lastLiveWebhookAt: string | null;
  lastPaymentEventAt: string | null;
  lastError: string | null;
  configVersion: number;
  updatedAt: string;
  updatedBy: string;
  webhookUrls: {
    test: string;
    live: string;
  };
  history: GatewayConfigHistoryRecord[];
  recentWebhooks: WebhookEventRecord[];
}

interface DiagnosticCheck {
  name: string;
  passed: boolean;
  detail: string;
}

function statusBadgeVariant(state: GatewayConnectionState) {
  switch (state) {
    case "ACTIVE":
      return "success" as const;
    case "VERIFIED":
      return "primary" as const;
    case "CONNECTION_FAILED":
    case "DISABLED":
      return "danger" as const;
    case "CONFIGURED":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

export function RazorpayGatewayControlCenter({
  initialOverview,
}: {
  initialOverview: SafeGatewayOverviewData;
}) {
  const [overview, setOverview] = React.useState(initialOverview);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Test mode inputs
  const [testKeyId, setTestKeyId] = React.useState("");
  const [testKeySecret, setTestKeySecret] = React.useState("");
  const [testWebhookSecret, setTestWebhookSecret] = React.useState("");

  // Live mode inputs
  const [liveKeyId, setLiveKeyId] = React.useState("");
  const [liveKeySecret, setLiveKeySecret] = React.useState("");
  const [liveWebhookSecret, setLiveWebhookSecret] = React.useState("");
  const [liveMerchantApproved, setLiveMerchantApproved] = React.useState(
    initialOverview.liveMerchantApproved
  );

  // Diagnostics
  const [diagnosticChecks, setDiagnosticChecks] = React.useState<
    DiagnosticCheck[] | null
  >(null);
  const [diagnosticEnv, setDiagnosticEnv] = React.useState<GatewayEnvironment | null>(
    null
  );
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);

  const callEndpoint = async <T,>(
    url: string,
    payload: unknown,
    successMsg: string
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: T;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Operation failed.");
        return null;
      }
      setMessage(successMsg);
      return json.data;
    } catch {
      setError("Network error communicating with gateway control API.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKeys = async (e: React.FormEvent, environment: GatewayEnvironment) => {
    e.preventDefault();
    const keyId = environment === "test" ? testKeyId : liveKeyId;
    const keySecret = environment === "test" ? testKeySecret : liveKeySecret;
    const data = await callEndpoint<SafeGatewayOverviewData>(
      "/api/super-admin/payment-gateway/razorpay/configure",
      { environment, keyId, keySecret },
      `${environment.toUpperCase()} credentials saved to Secret Manager.`
    );
    if (data) {
      setOverview(data);
      if (environment === "test") {
        setTestKeyId("");
        setTestKeySecret("");
      } else {
        setLiveKeyId("");
        setLiveKeySecret("");
      }
    }
  };

  const handleSaveWebhookSecret = async (
    e: React.FormEvent,
    environment: GatewayEnvironment
  ) => {
    e.preventDefault();
    const webhookSecret = environment === "test" ? testWebhookSecret : liveWebhookSecret;
    const data = await callEndpoint<SafeGatewayOverviewData>(
      "/api/super-admin/payment-gateway/razorpay/webhook-secret",
      { environment, webhookSecret },
      `${environment.toUpperCase()} webhook secret saved. Send a signed test event from Razorpay Dashboard to verify.`
    );
    if (data) {
      setOverview(data);
      if (environment === "test") setTestWebhookSecret("");
      else setLiveWebhookSecret("");
    }
  };

  const handleTestConnection = async (environment: GatewayEnvironment) => {
    const data = await callEndpoint<{
      verified: boolean;
      overview: SafeGatewayOverviewData;
    }>(
      "/api/super-admin/payment-gateway/razorpay/test-connection",
      { environment },
      `${environment.toUpperCase()} Razorpay API connection verified.`
    );
    if (data?.overview) {
      setOverview(data.overview);
    }
  };

  const handleRunDiagnostics = async (environment: GatewayEnvironment) => {
    const data = await callEndpoint<{
      environment: GatewayEnvironment;
      allPassed: boolean;
      checks: DiagnosticCheck[];
    }>(
      "/api/super-admin/payment-gateway/razorpay/diagnostics",
      { environment },
      `${environment.toUpperCase()} diagnostics completed.`
    );
    if (data) {
      setDiagnosticEnv(data.environment);
      setDiagnosticChecks(data.checks);
    }
  };

  const handleActivate = async (environment: GatewayEnvironment) => {
    const data = await callEndpoint<SafeGatewayOverviewData>(
      "/api/super-admin/payment-gateway/razorpay/activate",
      {
        action: "activate",
        environment,
        liveMerchantApproved: environment === "live" ? liveMerchantApproved : undefined,
      },
      `Razorpay gateway activated in ${environment.toUpperCase()} mode.`
    );
    if (data) setOverview(data);
  };

  const handleDisable = async () => {
    const data = await callEndpoint<SafeGatewayOverviewData>(
      "/api/super-admin/payment-gateway/razorpay/activate",
      { action: "disable" },
      "Gateway disabled. Historical records remain intact."
    );
    if (data) setOverview(data);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2.5 rounded-lg border border-red-200 p-3.5 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2.5 rounded-lg border border-emerald-200 p-3.5 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {/* 1. Gateway Overview & Enable/Disable Controls */}
      <Card>
        <CardHeader className="border-border flex flex-col justify-between gap-4 border-b sm:flex-row sm:items-center">
          <div>
            <CardTitle>1. Gateway Overview</CardTitle>
            <p className="text-muted mt-1 text-xs">
              Central platform Razorpay merchant configuration (v{overview.configVersion})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={overview.enabled ? "success" : "danger"}>
              {overview.enabled ? "Gateway Enabled" : "Gateway Disabled"}
            </Badge>
            {overview.activeEnvironment && (
              <Badge variant="navy">
                Active: {overview.activeEnvironment.toUpperCase()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-border bg-surface rounded-lg border p-3.5">
              <p className="text-muted text-xs">Test Mode Status</p>
              <div className="mt-1.5 flex items-center justify-between">
                <Badge variant={statusBadgeVariant(overview.testStatus)}>
                  {overview.testStatus}
                </Badge>
              </div>
              <p className="text-muted mt-2 text-[11px]">
                Last test:{" "}
                {overview.lastTestConnectionAt?.slice(0, 16).replace("T", " ") ?? "Never"}
              </p>
            </div>

            <div className="border-border bg-surface rounded-lg border p-3.5">
              <p className="text-muted text-xs">Live Mode Status</p>
              <div className="mt-1.5 flex items-center justify-between">
                <Badge variant={statusBadgeVariant(overview.liveStatus)}>
                  {overview.liveStatus}
                </Badge>
              </div>
              <p className="text-muted mt-2 text-[11px]">
                Last test:{" "}
                {overview.lastLiveConnectionAt?.slice(0, 16).replace("T", " ") ?? "Never"}
              </p>
            </div>

            <div className="border-border bg-surface rounded-lg border p-3.5">
              <p className="text-muted text-xs">Webhook Verification</p>
              <p className="text-foreground mt-1.5 text-xs font-medium">
                Test: {overview.testWebhookVerified ? "Verified" : "Unverified"} &bull;
                Live: {overview.liveWebhookVerified ? "Verified" : "Unverified"}
              </p>
              <p className="text-muted mt-2 text-[11px]">
                Last webhook:{" "}
                {(overview.lastLiveWebhookAt || overview.lastTestWebhookAt)
                  ?.slice(0, 16)
                  .replace("T", " ") ?? "None"}
              </p>
            </div>

            <div className="border-border bg-surface rounded-lg border p-3.5">
              <p className="text-muted text-xs">Last Payment Event</p>
              <p className="text-foreground mt-1.5 font-mono text-xs font-medium">
                {overview.lastPaymentEventAt?.slice(0, 16).replace("T", " ") ??
                  "No events"}
              </p>
              {overview.lastError && (
                <p className="text-danger mt-1.5 truncate text-[11px]">
                  {overview.lastError}
                </p>
              )}
            </div>
          </div>

          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="outline"
                size="sm"
                loading={loading}
                leftIcon={<Power className="h-4 w-4" aria-hidden="true" />}
                onClick={() => handleActivate("test")}
              >
                Activate Test Mode
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={loading}
                leftIcon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                onClick={() => handleActivate("live")}
              >
                Activate Live Mode
              </Button>
            </div>

            <Button
              variant="destructive"
              size="sm"
              loading={loading}
              leftIcon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
              onClick={handleDisable}
            >
              Emergency Disable Gateway
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2 & 3. Test Mode and Live Mode Configuration */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-border border-b">
            <div className="flex items-center justify-between">
              <CardTitle>2. Test Mode Configuration</CardTitle>
              <Badge variant={statusBadgeVariant(overview.testStatus)}>
                {overview.testStatus}
              </Badge>
            </div>
            <p className="text-muted mt-1 text-xs">
              Current Key ID: {overview.maskedTestKeyId ?? "Not configured"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <form onSubmit={(e) => handleSaveKeys(e, "test")} className="space-y-3.5">
              <Input
                label="Test Key ID"
                placeholder="rzp_test_..."
                value={testKeyId}
                onChange={(e) => setTestKeyId(e.target.value)}
                required
              />
              <Input
                label="Test Key Secret (stored in Secret Manager)"
                type="password"
                placeholder="Enter or replace Test Key Secret"
                leftAddon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                value={testKeySecret}
                onChange={(e) => setTestKeySecret(e.target.value)}
                required
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" loading={loading}>
                  Save Test Credentials
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={loading}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => handleTestConnection("test")}
                >
                  Test Connection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-border border-b">
            <div className="flex items-center justify-between">
              <CardTitle>3. Live Mode Configuration</CardTitle>
              <Badge variant={statusBadgeVariant(overview.liveStatus)}>
                {overview.liveStatus}
              </Badge>
            </div>
            <p className="text-muted mt-1 text-xs">
              Current Key ID: {overview.maskedLiveKeyId ?? "Not configured"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <form onSubmit={(e) => handleSaveKeys(e, "live")} className="space-y-3.5">
              <Input
                label="Live Key ID"
                placeholder="rzp_live_..."
                value={liveKeyId}
                onChange={(e) => setLiveKeyId(e.target.value)}
                required
              />
              <Input
                label="Live Key Secret (stored in Secret Manager)"
                type="password"
                placeholder="Enter or replace Live Key Secret"
                leftAddon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                value={liveKeySecret}
                onChange={(e) => setLiveKeySecret(e.target.value)}
                required
              />
              <Checkbox
                label="Confirm Razorpay Live merchant account is KYC-approved for production capture"
                checked={liveMerchantApproved}
                onChange={(e) => setLiveMerchantApproved(e.target.checked)}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" loading={loading}>
                  Save Live Credentials
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={loading}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => handleTestConnection("live")}
                >
                  Test Connection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 4. Webhook Configuration */}
      <Card>
        <CardHeader className="border-border border-b">
          <div className="flex items-center gap-2">
            <Webhook className="text-primary h-5 w-5" aria-hidden="true" />
            <CardTitle>4. Webhook Configuration</CardTitle>
          </div>
          <p className="text-muted mt-1 text-xs">
            Register these URLs in Razorpay Dashboard &rarr; Account &amp; Settings &rarr;
            Webhooks. Subscribing to <code className="font-mono">payment.authorized</code>
            , <code className="font-mono">payment.captured</code>,{" "}
            <code className="font-mono">payment.failed</code>, and{" "}
            <code className="font-mono">refund.processed</code> is required. For local
            development, use an HTTPS tunnel (e.g. ngrok) or staging domain.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 pt-5 lg:grid-cols-2">
          <div className="border-border bg-surface space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm font-semibold">Test Webhook</span>
              <Badge variant={overview.testWebhookVerified ? "success" : "warning"}>
                {overview.testWebhookVerified ? "Verified" : "Awaiting Signed Event"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="border-border bg-background flex-1 truncate rounded border px-2.5 py-1.5 font-mono text-xs">
                {overview.webhookUrls.test}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(overview.webhookUrls.test);
                  setCopiedUrl("test");
                }}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                {copiedUrl === "test" ? "Copied" : "Copy"}
              </Button>
            </div>
            <form
              onSubmit={(e) => handleSaveWebhookSecret(e, "test")}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <Input
                label="Test Webhook Secret"
                type="password"
                placeholder="Enter Test Webhook Secret"
                value={testWebhookSecret}
                onChange={(e) => setTestWebhookSecret(e.target.value)}
                required
              />
              <Button type="submit" size="md" loading={loading}>
                Save
              </Button>
            </form>
          </div>

          <div className="border-border bg-surface space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm font-semibold">Live Webhook</span>
              <Badge variant={overview.liveWebhookVerified ? "success" : "warning"}>
                {overview.liveWebhookVerified ? "Verified" : "Awaiting Signed Event"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="border-border bg-background flex-1 truncate rounded border px-2.5 py-1.5 font-mono text-xs">
                {overview.webhookUrls.live}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(overview.webhookUrls.live);
                  setCopiedUrl("live");
                }}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                {copiedUrl === "live" ? "Copied" : "Copy"}
              </Button>
            </div>
            <form
              onSubmit={(e) => handleSaveWebhookSecret(e, "live")}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <Input
                label="Live Webhook Secret"
                type="password"
                placeholder="Enter Live Webhook Secret"
                value={liveWebhookSecret}
                onChange={(e) => setLiveWebhookSecret(e.target.value)}
                required
              />
              <Button type="submit" size="md" loading={loading}>
                Save
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* 5. Connection Diagnostics & Webhook Testing Center */}
      <Card>
        <CardHeader className="border-border flex flex-col justify-between gap-3 border-b sm:flex-row sm:items-center">
          <div>
            <CardTitle>5. Connection Diagnostics &amp; Webhook Testing Center</CardTitle>
            <p className="text-muted mt-1 text-xs">
              Verifies API auth, HMAC-SHA256 signature validation, signed delivery, and
              captured payment flow.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={loading}
              onClick={() => handleRunDiagnostics("test")}
            >
              Run Test Diagnostics
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={loading}
              onClick={() => handleRunDiagnostics("live")}
            >
              Run Live Diagnostics
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {!diagnosticChecks ? (
            <p className="text-muted text-sm">
              Run diagnostics for Test or Live mode to inspect readiness checks.
            </p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-foreground text-xs font-semibold uppercase">
                {diagnosticEnv?.toUpperCase()} Environment Results
              </p>
              {diagnosticChecks.map((check) => (
                <div
                  key={check.name}
                  className="border-border bg-surface flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-foreground text-sm font-medium">{check.name}</p>
                    <p className="text-muted text-xs">{check.detail}</p>
                  </div>
                  <Badge variant={check.passed ? "success" : "warning"}>
                    {check.passed ? "Passed" : "Action Needed"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Payment & Webhook Logs */}
      <Card>
        <CardHeader className="border-border flex flex-row items-center justify-between border-b">
          <CardTitle>6. Recent Webhook Events &amp; Payment Logs</CardTitle>
          <Link
            href="/su/payments"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open Full Payment Dashboard
          </Link>
        </CardHeader>
        <CardContent className="pt-5">
          {overview.recentWebhooks.length === 0 ? (
            <p className="text-muted text-sm">No webhook events received yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-border text-muted border-b uppercase">
                    <th className="py-2 pr-4">Received</th>
                    <th className="py-2 pr-4">Env</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Order ID</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {overview.recentWebhooks.map((wh) => (
                    <tr key={wh.id}>
                      <td className="text-muted py-2 pr-4 font-mono">
                        {wh.receivedAt.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="py-2 pr-4 uppercase">{wh.environment}</td>
                      <td className="py-2 pr-4 font-mono">{wh.eventType}</td>
                      <td className="py-2 pr-4 font-mono">{wh.orderId ?? "—"}</td>
                      <td className="py-2">
                        <Badge
                          variant={
                            wh.status === "processed"
                              ? "success"
                              : wh.status === "rejected" || wh.status === "failed"
                                ? "danger"
                                : "outline"
                          }
                        >
                          {wh.status}
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

      {/* 7. Security & Configuration History */}
      <Card>
        <CardHeader className="border-border border-b">
          <CardTitle>7. Security &amp; Configuration History</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {overview.history.length === 0 ? (
            <p className="text-muted text-sm">No configuration changes recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-border text-muted border-b uppercase">
                    <th className="py-2 pr-4">Timestamp</th>
                    <th className="py-2 pr-4">Version</th>
                    <th className="py-2 pr-4">Env</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {overview.history.map((item) => (
                    <tr key={item.id}>
                      <td className="text-muted py-2 pr-4 font-mono">
                        {item.createdAt.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="py-2 pr-4 font-mono">v{item.configVersion}</td>
                      <td className="py-2 pr-4 uppercase">{item.environment}</td>
                      <td className="py-2 pr-4 font-medium">{item.action}</td>
                      <td className="text-muted py-2">{item.summary}</td>
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
