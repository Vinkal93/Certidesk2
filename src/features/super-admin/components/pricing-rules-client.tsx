"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingPricingRuleRecord } from "@/types/billing";

export function PricingRulesClient({
  initialRules,
}: {
  initialRules: BillingPricingRuleRecord[];
}) {
  const [rules, setRules] = React.useState(initialRules);
  const [serviceKey, setServiceKey] =
    React.useState<BillingPricingRuleRecord["serviceKey"]>("student_admission");
  const [description, setDescription] = React.useState("Student Admission Fee");
  const [amountRupees, setAmountRupees] = React.useState("150");
  const [unit, setUnit] = React.useState("per_student");
  const [applicableInstituteId, setApplicableInstituteId] = React.useState("");
  const [taxTreatment, setTaxTreatment] =
    React.useState<BillingPricingRuleRecord["taxTreatment"]>("exempt");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/su/billing/pricing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceKey,
          description,
          amountRupees: Number(amountRupees),
          unit,
          applicableInstituteId: applicableInstituteId.trim() || null,
          taxTreatment,
          taxRateBps: 0,
          effectiveStart: new Date().toISOString().slice(0, 10),
          status: "active",
          reason,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { rule: BillingPricingRuleRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to save pricing rule.");
        return;
      }
      setRules((prev) => [json.data!.rule, ...prev]);
      setMessage(`Pricing rule ${json.data.rule.id} saved.`);
      setReason("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="text-primary h-4 w-4" aria-hidden="true" />
            Add / Override Service Pricing Rule
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
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="mb-1 block font-medium">Service Key</label>
                <select
                  value={serviceKey}
                  onChange={(e) =>
                    setServiceKey(
                      e.target.value as BillingPricingRuleRecord["serviceKey"]
                    )
                  }
                  className="border-border bg-background h-10 w-full rounded-lg border px-2.5"
                >
                  <option value="student_admission">student_admission</option>
                  <option value="profile_edit">profile_edit</option>
                  <option value="certificate_issue">certificate_issue</option>
                  <option value="marksheet_issue">marksheet_issue</option>
                  <option value="custom">custom</option>
                </select>
              </div>
              <Input
                label="Amount (₹)"
                type="number"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                required
              />
            </div>
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              />
              <Input
                label="Institute Override (Optional)"
                placeholder="INST_..."
                value={applicableInstituteId}
                onChange={(e) => setApplicableInstituteId(e.target.value)}
              />
            </div>
            <div className="text-xs">
              <label className="mb-1 block font-medium">Tax Treatment</label>
              <select
                value={taxTreatment}
                onChange={(e) =>
                  setTaxTreatment(
                    e.target.value as BillingPricingRuleRecord["taxTreatment"]
                  )
                }
                className="border-border bg-background h-10 w-full rounded-lg border px-2.5"
              >
                <option value="exempt">Exempt / Non-Taxable</option>
                <option value="taxable_exclusive">Taxable (Exclusive)</option>
                <option value="taxable_inclusive">Taxable (Inclusive)</option>
              </select>
            </div>
            <Input
              label="Change Reason (Required)"
              placeholder="e.g. Promotional pricing for Q4"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
            <Button type="submit" size="sm" loading={loading}>
              Save Pricing Rule
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="text-base">
            Effective Pricing Rules ({rules.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <p className="text-muted p-6 text-center text-sm">
              No custom pricing rules configured; central platform defaults apply.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{r.serviceKey}</span>
                      <Badge variant={r.status === "active" ? "success" : "outline"}>
                        {r.status}
                      </Badge>
                      {r.applicableInstituteId && (
                        <Badge variant="primary">{r.applicableInstituteId}</Badge>
                      )}
                    </div>
                    <p className="text-muted mt-0.5">
                      {r.description} · Reason: {r.reason}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold">
                    ₹{(r.amountPaise / 100).toFixed(2)} / {r.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
