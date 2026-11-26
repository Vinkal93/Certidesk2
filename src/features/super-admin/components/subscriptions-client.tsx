"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  EntitlementOverrideRecord,
  InstituteSubscriptionRecord,
} from "@/services/entitlement.service";
import type { SubscriptionPlanRecord } from "@/services/su-platform.service";

interface Props {
  subscriptions: InstituteSubscriptionRecord[];
  overrides: EntitlementOverrideRecord[];
  plans: SubscriptionPlanRecord[];
  institutes: { id: string; name: string; code: string; status: string }[];
}

export function SubscriptionsClient({
  subscriptions,
  overrides,
  plans,
  institutes,
}: Props) {
  const router = useRouter();
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [overrideInstId, setOverrideInstId] = useState(institutes[0]?.id ?? "");
  const [featureKey, setFeatureKey] = useState("students");
  const [limitOverride, setLimitOverride] = useState("500");
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch("/api/su/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign_subscription",
        instituteId,
        planId,
        billingCycle,
      }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      setError(json.error?.message ?? "Failed to assign subscription.");
      return;
    }
    setNotice("Subscription assigned with price & quota snapshot.");
    router.refresh();
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const parsedLimit = Number(limitOverride);
    const res = await fetch("/api/su/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set_override",
        instituteId: overrideInstId,
        featureKey,
        enabled: true,
        ...(Number.isFinite(parsedLimit) ? { limitOverride: parsedLimit } : {}),
        reason: overrideReason,
      }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      setError(json.error?.message ?? "Failed to save entitlement override.");
      return;
    }
    setNotice("Entitlement override saved.");
    setOverrideReason("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign Institute Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Institute
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={instituteId}
                  onChange={(e) => setInstituteId(e.target.value)}
                >
                  {institutes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Plan
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.monthlyDisplayRupees}/mo)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Billing Cycle
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as "monthly" | "yearly")}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <Button type="submit" disabled={!instituteId || !planId}>
                Assign Subscription
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Set Entitlement Override</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOverride} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Institute
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={overrideInstId}
                  onChange={(e) => setOverrideInstId(e.target.value)}
                >
                  {institutes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Feature / Quota Key
                  </label>
                  <Input
                    value={featureKey}
                    onChange={(e) => setFeatureKey(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Limit Override
                  </label>
                  <Input
                    type="number"
                    value={limitOverride}
                    onChange={(e) => setLimitOverride(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Audit Reason
                </label>
                <Input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Enterprise contract exception"
                  required
                />
              </div>
              <Button type="submit" disabled={!overrideInstId}>
                Save Override
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Subscriptions ({subscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No institute subscriptions assigned yet.</p>
          ) : (
            subscriptions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{s.instituteId}</span>{" "}
                  <Badge variant="outline">{s.planName}</Badge>{" "}
                  <Badge>{s.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  ₹{s.priceSnapshotRupees} / {s.billingCycle} • Max Students: {s.limitsSnapshot.maxStudents}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entitlement Overrides ({overrides.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entitlement overrides configured.</p>
          ) : (
            overrides.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{o.instituteId}</span> •{" "}
                  <span className="font-mono text-xs">{o.featureKey}</span>{" "}
                  <Badge variant={o.enabled ? "success" : "danger"}>
                    {o.enabled ? "Enabled" : "Blocked"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Limit: {o.limitOverride ?? "N/A"} • {o.reason}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
