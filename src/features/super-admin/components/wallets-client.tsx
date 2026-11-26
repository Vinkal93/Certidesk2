"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstituteRecord, WalletTransactionRecord } from "@/types/domain";

export function SuWalletsClient({
  initialInstitutes,
  initialTransactions,
}: {
  initialInstitutes: InstituteRecord[];
  initialTransactions: WalletTransactionRecord[];
}) {
  const [institutes, setInstitutes] = React.useState(initialInstitutes);
  const [transactions, setTransactions] = React.useState(initialTransactions);
  const [instituteId, setInstituteId] = React.useState(initialInstitutes[0]?.id ?? "");
  const [type, setType] = React.useState<"credit" | "debit">("credit");
  const [amountRupees, setAmountRupees] = React.useState("500");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const idempotencyKey = `MANUAL_${Date.now()}`;
      const res = await fetch("/api/su/wallets/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituteId,
          type,
          amountRupees: Number(amountRupees),
          reason,
          idempotencyKey,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { transaction: WalletTransactionRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Adjustment failed.");
        return;
      }
      const tx = json.data.transaction;
      setInstitutes((prev) =>
        prev.map((i) =>
          i.id === tx.instituteId ? { ...i, walletBalancePaise: tx.balanceAfterPaise } : i
        )
      );
      setTransactions((prev) => [tx, ...prev]);
      setReason("");
      setMessage(
        `Atomic ${tx.type} applied. New balance: ₹${(tx.balanceAfterPaise / 100).toFixed(2)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Manual Wallet Adjustment (Audited)</CardTitle>
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
            <form onSubmit={handleAdjust} className="space-y-3.5">
              <Select
                label="Institute"
                value={instituteId}
                onChange={(e) => setInstituteId(e.target.value)}
                options={
                  institutes.length > 0
                    ? institutes.map((i) => ({
                        label: `${i.name} (₹${(i.walletBalancePaise / 100).toFixed(2)})`,
                        value: i.id,
                      }))
                    : [{ label: "No institutes", value: "" }]
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Type"
                  value={type}
                  onChange={(e) => setType(e.target.value as "credit" | "debit")}
                  options={[
                    { label: "Credit (+)", value: "credit" },
                    { label: "Debit (-)", value: "debit" },
                  ]}
                />
                <Input
                  label="Amount (₹)"
                  type="number"
                  min="1"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Mandatory Audit Reason"
                placeholder="e.g. Promotional onboarding credit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={institutes.length === 0}
              >
                Execute Atomic Adjustment
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Institute Wallet Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {institutes.length === 0 ? (
              <p className="text-muted text-sm">No institutes registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-border text-muted border-b text-xs uppercase">
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2 pr-4">Institute</th>
                      <th className="py-2">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/70 divide-y">
                    {institutes.map((inst) => (
                      <tr key={inst.id}>
                        <td className="py-2.5 pr-4 font-mono text-xs">{inst.code}</td>
                        <td className="py-2.5 pr-4 font-medium">{inst.name}</td>
                        <td className="py-2.5 font-semibold">
                          ₹{(inst.walletBalancePaise / 100).toFixed(2)}
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

      <Card>
        <CardHeader>
          <CardTitle>Platform Wallet Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted text-sm">No wallet transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-border text-muted border-b uppercase">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Institute</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Reason</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-muted py-2 pr-4 font-mono">
                        {tx.createdAt.slice(0, 10)}
                      </td>
                      <td className="py-2 pr-4 font-mono">{tx.instituteId}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={tx.type === "credit" ? "success" : "warning"}>
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{tx.reason}</td>
                      <td className="py-2 pr-4 font-medium">
                        ₹{(tx.amountPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-2 font-medium">
                        ₹{(tx.balanceAfterPaise / 100).toFixed(2)}
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
