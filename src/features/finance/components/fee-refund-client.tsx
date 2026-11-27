"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeePaymentRecord } from "@/types/academic";
import type { FeePaymentMethod, FeeRefundRecord } from "@/types/finance";

export function FeeRefundClient({
  payments,
  refunds,
}: {
  payments: FeePaymentRecord[];
  refunds: FeeRefundRecord[];
}) {
  const router = useRouter();
  const [paymentId, setPaymentId] = React.useState(payments[0]?.id ?? "");
  const [amountRupees, setAmountRupees] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [method, setMethod] = React.useState<FeePaymentMethod>("cash");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/finance/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          amountRupees: Number(amountRupees),
          reason,
          method,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Refund failed.");
        return;
      }
      setAmountRupees("");
      setReason("");
      setMessage("Refund recorded atomically and student balance updated.");
      router.refresh();
    } catch {
      setError("Network error while processing refund.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Issue Fee Refund (Audited)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
          {message ? (
            <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Original Payment"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              options={
                payments.length === 0
                  ? [{ label: "No fee payments available", value: "" }]
                  : payments.map((p) => ({
                      label: `${p.id} — ₹${(p.amountPaise / 100).toFixed(2)} (${p.createdAt.slice(0, 10)})`,
                      value: p.id,
                    }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Refund Amount (₹)"
                type="number"
                min={1}
                required
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
              />
              <Select
                label="Refund Method"
                value={method}
                onChange={(e) => setMethod(e.target.value as FeePaymentMethod)}
                options={[
                  { label: "Cash", value: "cash" },
                  { label: "UPI", value: "upi" },
                  { label: "Bank Transfer", value: "bank_transfer" },
                ]}
              />
            </div>
            <Input
              label="Refund Reason"
              required
              placeholder="e.g. Course withdrawal within 7 days"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button type="submit" loading={loading} fullWidth disabled={!paymentId}>
              Record Fee Refund
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle>Refund History ({refunds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-border divide-y text-xs">
            {refunds.length === 0 ? (
              <p className="text-muted py-6 text-center">No fee refunds recorded.</p>
            ) : (
              refunds.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-foreground font-semibold">
                      {r.studentName} ({r.studentCode})
                    </p>
                    <p className="text-muted">
                      Ref: {r.originalPaymentId} · {r.reason}
                    </p>
                  </div>
                  <span className="text-danger font-bold tabular-nums">
                    -₹{(r.amountPaise / 100).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
