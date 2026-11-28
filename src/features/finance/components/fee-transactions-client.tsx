"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import type { FeePaymentRecord } from "@/types/academic";

export function FeeTransactionsClient({
  initialPayments,
}: {
  initialPayments: FeePaymentRecord[];
}) {
  const router = useRouter();
  const [payments, setPayments] = React.useState(initialPayments);
  const [deleteTarget, setDeleteTarget] = React.useState<FeePaymentRecord | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleDeleteTransaction = async (reason: string) => {
    if (!deleteTarget) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/finance/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: deleteTarget.id, reason }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { reversalRef: string; receiptNumber: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to reverse fee transaction.");
        return;
      }
      setPayments((prev) =>
        prev.map((p) =>
          p.id === deleteTarget.id
            ? {
                ...p,
                status: "reversed",
                reversalRef: json.data?.reversalRef ?? "REV",
              }
            : p
        )
      );
      setMessage(
        `Transaction ${deleteTarget.id} reversed (${json.data?.reversalRef ?? ""}). Student balance, receipt ${json.data?.receiptNumber ?? ""}, and account ledger updated.`
      );
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setError("Network error while reversing fee transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-800/60"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs dark:border-emerald-800/60">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fee Transactions ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-border bg-surface text-muted border-b">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Transaction ID</th>
                  <th className="px-3 py-2.5 font-semibold">Student</th>
                  <th className="px-3 py-2.5 font-semibold">Method</th>
                  <th className="px-3 py-2.5 font-semibold">Amount</th>
                  <th className="px-3 py-2.5 font-semibold">Receipt / Ref</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-muted px-3 py-6 text-center">
                      No fee transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const isReversed = p.status === "reversed";
                    return (
                      <tr key={p.id}>
                        <td className="px-3 py-2.5 font-mono">{p.id}</td>
                        <td className="px-3 py-2.5 font-medium">{p.studentName}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline">{p.paymentMode.toUpperCase()}</Badge>
                        </td>
                        <td
                          className={`px-3 py-2.5 font-semibold tabular-nums ${
                            isReversed ? "text-muted line-through" : "text-success"
                          }`}
                        >
                          ₹{(p.amountPaise / 100).toFixed(2)}
                        </td>
                        <td className="text-muted px-3 py-2.5">
                          {p.receiptNo || p.note || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={isReversed ? "danger" : "success"}>
                            {isReversed ? `Reversed (${p.reversalRef ?? ""})` : "Posted"}
                          </Badge>
                        </td>
                        <td className="text-muted px-3 py-2.5">
                          {p.createdAt.slice(0, 10)}
                        </td>
                        <td className="px-3 py-2.5">
                          {!isReversed && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Delete / Reverse ${p.id}`}
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2
                                className="text-danger h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(reason) => handleDeleteTransaction(reason)}
        title="Delete / Reverse Fee Transaction"
        recordLabel={
          deleteTarget
            ? `${deleteTarget.id} · ${deleteTarget.studentName} (₹${(deleteTarget.amountPaise / 100).toFixed(2)})`
            : ""
        }
        affectedSummary="Reverses this fee transaction, cancels the linked receipt, restores the student's outstanding balance, reverses the linked Cash/Bank account balance, and records an immutable audit log."
        confirmLabel="Confirm Delete & Reverse"
        loading={loading}
      />
    </div>
  );
}
