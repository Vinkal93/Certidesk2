"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstituteRecord, WalletTransactionRecord } from "@/types/domain";

interface ReconciliationReport {
  checkedAt: string;
  totalInstitutesChecked: number;
  discrepancies: Array<{
    instituteId: string;
    instituteName: string;
    projectedTotalPaise: number;
    ledgerComputedTotalPaise: number;
    discrepancyPaise: number;
    issues: string[];
  }>;
}

export function SuWalletsClient({
  initialInstitutes,
  initialTransactions,
}: {
  initialInstitutes: InstituteRecord[];
  initialTransactions: WalletTransactionRecord[];
}) {
  const router = useRouter();
  const [institutes, setInstitutes] = React.useState(initialInstitutes);
  const [transactions, setTransactions] = React.useState(initialTransactions);
  const [instituteId, setInstituteId] = React.useState(initialInstitutes[0]?.id ?? "");
  const [type, setType] = React.useState<"credit" | "debit">("credit");
  const [amountRupees, setAmountRupees] = React.useState("500");
  const [reason, setReason] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [internalNote, setInternalNote] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [reconciling, setReconciling] = React.useState(false);
  const [reconReport, setReconReport] = React.useState<ReconciliationReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const selectedInst = institutes.find((i) => i.id === instituteId);
  const currentBalancePaise = selectedInst
    ? (selectedInst.paidBalancePaise ?? selectedInst.walletBalancePaise) +
      (selectedInst.bonusBalancePaise ?? 0)
    : 0;
  const parsedAmountPaise = Math.max(0, Math.round((Number(amountRupees) || 0) * 100));
  const projectedBalancePaise =
    type === "credit"
      ? currentBalancePaise + parsedAmountPaise
      : currentBalancePaise - parsedAmountPaise;

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError("Please confirm the before/after balance preview before submitting.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const idempotencyKey = `MANUAL_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const res = await fetch("/api/su/wallets/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituteId,
          type,
          amountRupees: Number(amountRupees),
          reason,
          reference: reference || undefined,
          internalNote: internalNote || undefined,
          idempotencyKey,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          transaction: WalletTransactionRecord;
          summary?: {
            paidBalancePaise: number;
            bonusBalancePaise: number;
            totalSpendableBalancePaise: number;
            version: number;
          };
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Adjustment failed.");
        return;
      }
      const tx = json.data.transaction;
      const summary = json.data.summary;
      setInstitutes((prev) =>
        prev.map((i) =>
          i.id === tx.instituteId
            ? {
                ...i,
                walletBalancePaise:
                  summary?.totalSpendableBalancePaise ?? tx.balanceAfterPaise,
                ...(summary
                  ? {
                      paidBalancePaise: summary.paidBalancePaise,
                      bonusBalancePaise: summary.bonusBalancePaise,
                    }
                  : {}),
              }
            : i
        )
      );
      setTransactions((prev) => [tx, ...prev]);
      setReason("");
      setReference("");
      setInternalNote("");
      setConfirmed(false);
      setMessage(
        `Atomic ${tx.type} applied (Ref: ${tx.id}). New balance: ₹${(tx.balanceAfterPaise / 100).toFixed(2)}`
      );
      router.refresh();
    } catch {
      setError("Network error while applying wallet adjustment.");
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    setReconciling(true);
    setError(null);
    try {
      const qs =
        institutes.length === 1 && instituteId
          ? `?instituteId=${encodeURIComponent(instituteId)}`
          : "";
      const res = await fetch(`/api/su/wallets/reconcile${qs}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: ReconciliationReport;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Reconciliation failed.");
        return;
      }
      setReconReport(json.data);
    } catch {
      setError("Failed to run wallet reconciliation.");
    } finally {
      setReconciling(false);
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
            <form onSubmit={handleAdjust} className="space-y-4">
              <Select
                label="Institute"
                value={instituteId}
                onChange={(e) => setInstituteId(e.target.value)}
                options={institutes.map((i) => {
                  const totalPaise =
                    (i.paidBalancePaise ?? i.walletBalancePaise) +
                    (i.bonusBalancePaise ?? 0);
                  return {
                    label: `${i.name} (₹${(totalPaise / 100).toFixed(2)})`,
                    value: i.id,
                  };
                })}
              />

              <div className="border-border bg-surface grid grid-cols-2 gap-3 rounded-xl border p-3.5 text-xs">
                <div>
                  <p className="text-muted">Current Balance</p>
                  <p className="text-foreground mt-0.5 text-base font-bold tabular-nums">
                    ₹{(currentBalancePaise / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">After Adjustment</p>
                  <p
                    className={`mt-0.5 text-base font-bold tabular-nums ${
                      projectedBalancePaise < 0 ? "text-danger" : "text-primary"
                    }`}
                  >
                    ₹{(projectedBalancePaise / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Adjustment Type"
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
                  min={1}
                  step="1"
                  required
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                />
              </div>

              <Input
                label="Audit Reason"
                required
                placeholder="e.g. Manual NEFT deposit verified #TXN8821"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Reference No (optional)"
                  placeholder="UTR / Ticket ID"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <Input
                  label="Internal Note (optional)"
                  placeholder="Reviewed by ops"
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                />
              </div>

              <label className="border-border bg-surface flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded"
                />
                <span className="text-foreground">
                  I confirm this {type} of{" "}
                  <strong>₹{(parsedAmountPaise / 100).toFixed(2)}</strong> is accurate and
                  will be written atomically to the immutable wallet ledger.
                </span>
              </label>

              <Button type="submit" loading={loading} fullWidth>
                Apply Atomic Adjustment
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Wallet Ledger &amp; Reconciliation</CardTitle>
            <Button
              variant="outline"
              size="sm"
              loading={reconciling}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={handleReconcile}
            >
              Run Reconciliation
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {reconReport ? (
              <div className="border-border bg-surface rounded-xl border p-3.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground inline-flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="text-primary h-4 w-4" aria-hidden="true" />
                    Checked {reconReport.totalInstitutesChecked} institute(s)
                  </span>
                  <Badge
                    variant={
                      reconReport.discrepancies.length === 0 ? "success" : "danger"
                    }
                  >
                    {reconReport.discrepancies.length} Discrepancies
                  </Badge>
                </div>
                {reconReport.discrepancies.map((d) => (
                  <div
                    key={d.instituteId}
                    className="mt-2 rounded-lg border border-red-200 bg-red-50/70 p-2.5 text-red-800"
                  >
                    <p className="font-semibold">
                      {d.instituteName} ({d.instituteId})
                    </p>
                    <ul className="mt-1 list-disc pl-4">
                      {d.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border bg-surface text-muted border-b">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Tx ID</th>
                    <th className="px-3 py-2.5 font-semibold">Institute</th>
                    <th className="px-3 py-2.5 font-semibold">Type</th>
                    <th className="px-3 py-2.5 font-semibold">Amount</th>
                    <th className="px-3 py-2.5 font-semibold">Before → After</th>
                    <th className="px-3 py-2.5 font-semibold">Reason &amp; Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted px-3 py-6 text-center">
                        No wallet transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-3 py-2.5 font-mono text-[11px]">{tx.id}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px]">
                          {tx.instituteId}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={tx.type === "credit" ? "success" : "warning"}>
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 font-semibold tabular-nums">
                          {tx.type === "credit" ? "+" : "-"}₹
                          {(tx.amountPaise / 100).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {typeof tx.balanceBeforePaise === "number"
                            ? `₹${(tx.balanceBeforePaise / 100).toFixed(2)} → `
                            : ""}
                          ₹{(tx.balanceAfterPaise / 100).toFixed(2)}
                        </td>
                        <td className="text-muted px-3 py-2.5">{tx.note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
