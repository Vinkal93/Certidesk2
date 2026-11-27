"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Gift, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RechargePlanRecord } from "@/types/domain";

export function RechargePlansClient({
  initialPlans,
}: {
  initialPlans: RechargePlanRecord[];
}) {
  const router = useRouter();
  const [plans, setPlans] = React.useState(initialPlans);
  const [editingId, setEditingId] = React.useState(initialPlans[0]?.id ?? "plan_2000");
  const current = plans.find((p) => p.id === editingId) ?? plans[0];

  const [title, setTitle] = React.useState(current?.title ?? "");
  const [description, setDescription] = React.useState(current?.description ?? "");
  const [amountRupees, setAmountRupees] = React.useState(
    String((current?.amountPaise ?? 50000) / 100)
  );
  const [bonusRupees, setBonusRupees] = React.useState(
    String((current?.bonusPaise ?? 0) / 100)
  );
  const [enabled, setEnabled] = React.useState(current?.enabled ?? true);
  const [promoEligible, setPromoEligible] = React.useState(
    current?.promoEligible ?? false
  );
  const [promoLabel, setPromoLabel] = React.useState(current?.promoLabel ?? "");
  const [bonusExpiryDays, setBonusExpiryDays] = React.useState(
    current?.bonusExpiryDays ? String(current.bonusExpiryDays) : ""
  );
  const [displayOrder, setDisplayOrder] = React.useState(
    String(current?.displayOrder ?? 1)
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const selectPlan = (plan: RechargePlanRecord) => {
    setEditingId(plan.id);
    setTitle(plan.title);
    setDescription(plan.description);
    setAmountRupees(String(plan.amountPaise / 100));
    setBonusRupees(String(plan.bonusPaise / 100));
    setEnabled(plan.enabled);
    setPromoEligible(plan.promoEligible);
    setPromoLabel(plan.promoLabel ?? "");
    setBonusExpiryDays(plan.bonusExpiryDays ? String(plan.bonusExpiryDays) : "");
    setDisplayOrder(String(plan.displayOrder));
    setError(null);
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/su/recharge-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          title,
          description,
          amountRupees: Number(amountRupees),
          bonusRupees: Number(bonusRupees),
          enabled,
          displayOrder: Number(displayOrder),
          promoEligible,
          promoLabel: promoLabel.trim() || null,
          bonusExpiryDays: bonusExpiryDays.trim() ? Number(bonusExpiryDays) : null,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { plan: RechargePlanRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to save recharge plan.");
        return;
      }

      const saved = json.data.plan;
      setPlans((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        const next = exists
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [...prev, saved];
        return next.sort((a, b) => a.displayOrder - b.displayOrder);
      });
      setMessage(`Saved ${saved.title} (${saved.id}).`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => selectPlan(plan)}
            className={`cursor-pointer rounded-xl border p-4 transition-colors ${
              editingId === plan.id
                ? "border-primary bg-blue-50/40"
                : "border-border bg-background hover:bg-surface"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{plan.title}</span>
                {plan.promoEligible && plan.bonusPaise > 0 && (
                  <Badge variant="primary">
                    <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                    +₹{(plan.bonusPaise / 100).toFixed(0)} Bonus
                  </Badge>
                )}
              </div>
              <Badge variant={plan.enabled ? "success" : "danger"}>
                {plan.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <p className="text-muted mt-1 font-mono text-xs">
              {plan.id} · Pay ₹{(plan.amountPaise / 100).toFixed(2)} → Credit ₹
              {(
                (plan.amountPaise + (plan.promoEligible ? plan.bonusPaise : 0)) /
                100
              ).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="text-primary h-4 w-4" aria-hidden="true" />
            Configure Recharge Plan &amp; Promotion ({editingId})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Plan Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Input
                label="Display Order"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                required
              />
            </div>
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Amount (₹)"
                type="number"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                required
              />
              <Input
                label="Promo Bonus (₹)"
                type="number"
                value={bonusRupees}
                onChange={(e) => setBonusRupees(e.target.value)}
                required
              />
              <Input
                label="Bonus Expiry (Days)"
                type="number"
                placeholder="Optional (e.g. 180)"
                value={bonusExpiryDays}
                onChange={(e) => setBonusExpiryDays(e.target.value)}
              />
            </div>
            <Input
              label="Promotion Badge Label"
              placeholder="e.g. +₹200 Promotional Bonus"
              value={promoLabel}
              onChange={(e) => setPromoLabel(e.target.value)}
            />
            <div className="flex flex-wrap gap-6 text-xs">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span>Plan Enabled</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={promoEligible}
                  onChange={(e) => setPromoEligible(e.target.checked)}
                />
                <span>Promotion Eligible (Credit Bonus)</span>
              </label>
            </div>
            <Button type="submit" loading={loading}>
              Save Recharge Configuration
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
