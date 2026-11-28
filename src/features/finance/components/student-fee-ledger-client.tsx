"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { computeMonthlyDueBreakdown } from "@/lib/finance/monthly-dues";
import type { StudentFeePlanRecord } from "@/types/academic";
import type { FeeReceiptRecord } from "@/types/finance";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function StudentFeeLedgerClient({
  plans,
  receipts,
  initialStudentId,
}: {
  plans: StudentFeePlanRecord[];
  receipts: FeeReceiptRecord[];
  initialStudentId?: string | undefined;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [selectedPlanId, setSelectedPlanId] = React.useState(() => {
    if (initialStudentId) {
      const hit = plans.find((p) => p.studentId === initialStudentId);
      if (hit) return hit.id;
    }
    return plans[0]?.id ?? "";
  });

  const [reverseTarget, setReverseTarget] = React.useState<FeeReceiptRecord | null>(null);
  const [reverseLoading, setReverseLoading] = React.useState(false);

  const filteredPlans = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        p.studentCode.toLowerCase().includes(q) ||
        p.courseName.toLowerCase().includes(q)
    );
  }, [plans, search]);

  const activePlan =
    plans.find((p) => p.id === selectedPlanId) ?? filteredPlans[0] ?? null;

  const breakdown = React.useMemo(
    () => (activePlan ? computeMonthlyDueBreakdown(activePlan) : null),
    [activePlan]
  );

  const studentReceipts = React.useMemo(
    () =>
      activePlan ? receipts.filter((r) => r.studentId === activePlan.studentId) : [],
    [activePlan, receipts]
  );

  const handleReverse = async (reason: string) => {
    if (!reverseTarget) return;
    setReverseLoading(true);
    try {
      const res = await fetch("/api/institute/finance/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId: reverseTarget.id, reason }),
      });
      if (res.ok) {
        setReverseTarget(null);
        router.refresh();
      }
    } finally {
      setReverseLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Student Fee Ledger
          </h2>
          <p className="text-muted text-xs">
            Month-wise dues classification (Paid, Partial, Overdue, Current Due, Upcoming)
            and receipt reversals.
          </p>
        </div>
        <Link
          href="/institute/fees/collect"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          Collect Fee
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Student List */}
        <Card className="lg:col-span-4">
          <CardHeader className="border-border border-b pb-3">
            <CardTitle className="text-sm">Students ({filteredPlans.length})</CardTitle>
            <div className="mt-2">
              <Input
                placeholder="Search student or ID..."
                leftAddon={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[540px] divide-y overflow-y-auto p-0">
            {filteredPlans.length === 0 ? (
              <p className="text-muted p-6 text-center text-xs">
                No student fee plans found.
              </p>
            ) : (
              filteredPlans.map((p) => {
                const isActive = activePlan?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`border-border flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left text-xs transition-colors ${
                      isActive ? "bg-primary-soft/60" : "hover:bg-surface"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-semibold">
                        {p.studentName}
                      </p>
                      <p className="text-muted truncate">
                        {p.studentCode} · {p.courseName}
                      </p>
                    </div>
                    <Badge
                      variant={
                        p.pendingPaise <= 0
                          ? "success"
                          : p.paidPaise > 0
                            ? "warning"
                            : "danger"
                      }
                    >
                      {p.pendingPaise <= 0 ? "Paid" : formatInr(p.pendingPaise)}
                    </Badge>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Detailed Ledger */}
        <div className="space-y-5 lg:col-span-8">
          {!activePlan || !breakdown ? (
            <Card>
              <CardContent className="text-muted py-12 text-center text-sm">
                Select a student to inspect their month-wise fee ledger.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 8 Ledger Summary Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="border-border bg-background rounded-xl border p-3.5">
                  <p className="text-muted text-[11px]">Course Fee</p>
                  <p className="text-foreground mt-1 text-sm font-bold tabular-nums">
                    {formatInr(breakdown.courseFeePaise)}
                  </p>
                </div>
                <div className="border-border bg-background rounded-xl border p-3.5">
                  <p className="text-muted text-[11px]">Admission Fee</p>
                  <p className="text-foreground mt-1 text-sm font-bold tabular-nums">
                    {formatInr(breakdown.admissionFeePaise)}
                  </p>
                </div>
                <div className="border-border bg-background rounded-xl border p-3.5">
                  <p className="text-muted text-[11px]">Total Payable</p>
                  <p className="text-foreground mt-1 text-sm font-bold tabular-nums">
                    {formatInr(activePlan.totalFeePaise - activePlan.discountPaise)}
                  </p>
                </div>
                <div className="border-border bg-background rounded-xl border p-3.5">
                  <p className="text-muted text-[11px]">Total Paid</p>
                  <p className="text-success mt-1 text-sm font-bold tabular-nums">
                    {formatInr(activePlan.paidPaise)}
                  </p>
                </div>
                <div className="border-border bg-background rounded-xl border p-3.5">
                  <p className="text-muted text-[11px]">Total Outstanding</p>
                  <p className="text-danger mt-1 text-sm font-bold tabular-nums">
                    {formatInr(activePlan.pendingPaise)}
                  </p>
                </div>
                <div className="border-border bg-background rounded-xl border p-3.5">
                  <p className="text-muted text-[11px]">Overdue Amount</p>
                  <p className="text-danger mt-1 text-sm font-bold tabular-nums">
                    {formatInr(breakdown.overduePaise)}
                  </p>
                </div>
                <div className="border-border bg-background rounded-xl border p-3.5">
                  <p className="text-muted text-[11px]">Current Month Due</p>
                  <p className="text-warning mt-1 text-sm font-bold tabular-nums">
                    {formatInr(breakdown.dueThisMonthPaise)}
                  </p>
                </div>
                <div className="border-border bg-background rounded-xl border p-3.5">
                  <p className="text-muted text-[11px]">Upcoming Amount</p>
                  <p className="text-muted mt-1 text-sm font-bold tabular-nums">
                    {formatInr(breakdown.upcomingPaise)}
                  </p>
                </div>
              </div>

              {/* Month-Wise Installment Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Month-Wise Fee Breakdown — {activePlan.studentName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-border bg-surface text-muted border-b">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Period</th>
                          <th className="px-3 py-2 font-semibold">Due Date</th>
                          <th className="px-3 py-2 font-semibold">Fee</th>
                          <th className="px-3 py-2 font-semibold">Paid</th>
                          <th className="px-3 py-2 font-semibold">Remaining</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-border divide-y">
                        {breakdown.installments.map((inst) => (
                          <tr key={inst.index}>
                            <td className="px-3 py-2 font-medium">{inst.label}</td>
                            <td className="text-muted px-3 py-2 font-mono">
                              {inst.dueDate}
                            </td>
                            <td className="px-3 py-2 tabular-nums">
                              {formatInr(inst.amountPaise)}
                            </td>
                            <td className="text-success px-3 py-2 tabular-nums">
                              {formatInr(inst.paidPaise)}
                            </td>
                            <td className="text-danger px-3 py-2 font-semibold tabular-nums">
                              {formatInr(inst.pendingPaise)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={
                                  inst.status === "PAID"
                                    ? "success"
                                    : inst.status === "OVERDUE"
                                      ? "danger"
                                      : inst.status === "DUE" || inst.status === "PARTIAL"
                                        ? "warning"
                                        : "outline"
                                }
                              >
                                {inst.status === "DUE" ? "Current Due" : inst.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Receipts & Reversals */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Receipts &amp; Transactions ({studentReceipts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {studentReceipts.length === 0 ? (
                    <p className="text-muted text-xs">
                      No receipts recorded for this student yet.
                    </p>
                  ) : (
                    <div className="divide-border divide-y text-xs">
                      {studentReceipts.map((r) => (
                        <div
                          key={r.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">
                                {r.receiptNumber}
                              </span>
                              <Badge
                                variant={r.status === "cancelled" ? "danger" : "success"}
                              >
                                {r.status === "cancelled"
                                  ? `Reversed (${r.reversalRef ?? ""})`
                                  : "Issued"}
                              </Badge>
                            </div>
                            <p className="text-muted mt-0.5">
                              {r.feePeriod} · {r.paymentMethod.toUpperCase()} ·{" "}
                              {r.issuedAt.slice(0, 10)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold tabular-nums ${
                                r.status === "cancelled"
                                  ? "text-muted line-through"
                                  : "text-success"
                              }`}
                            >
                              {formatInr(r.amountPaise)}
                            </span>
                            {r.status !== "cancelled" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                leftIcon={
                                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                                }
                                onClick={() => setReverseTarget(r)}
                              >
                                Reverse
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        open={Boolean(reverseTarget)}
        onClose={() => setReverseTarget(null)}
        onConfirm={(reason) => handleReverse(reason)}
        title="Reverse Fee Receipt"
        recordLabel={
          reverseTarget
            ? `${reverseTarget.receiptNumber} (${formatInr(reverseTarget.amountPaise)})`
            : ""
        }
        affectedSummary="Cancels this receipt without erasing history and restores the student's outstanding balance."
        confirmLabel="Confirm Reversal"
        loading={reverseLoading}
      />
    </div>
  );
}
