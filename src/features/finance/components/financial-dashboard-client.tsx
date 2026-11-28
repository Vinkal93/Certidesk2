"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Download,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { computeMonthlyDueBreakdown } from "@/lib/finance/monthly-dues";
import type { StudentFeePlanRecord } from "@/types/academic";
import type {
  FeeReceiptRecord,
  FeeRefundRecord,
  InstituteAccountRecord,
  InstituteLedgerEntryRecord,
} from "@/types/finance";

export interface FinanceOverviewPayload {
  instituteId: string;
  instituteName: string;
  range: string;
  todayCollectionPaise: number;
  monthCollectionPaise: number;
  periodCollectionPaise: number;
  totalFeesCollectedPaise: number;
  totalOutstandingPaise: number;
  totalRefundedPaise: number;
  paidStudents: number;
  partialStudents: number;
  pendingStudents: number;
  otherIncomePaise: number;
  totalExpensesPaise: number;
  operationalSurplusPaise: number;
  methodTotalsPaise: Record<string, number>;
  collectionTrend: Array<{ label: string; date: string; amountPaise: number }>;
  incomeVsExpenseTrend: Array<{
    label: string;
    date: string;
    incomePaise: number;
    expensePaise: number;
  }>;
  plans: StudentFeePlanRecord[];
  receipts: FeeReceiptRecord[];
  refunds: FeeRefundRecord[];
  accounts: InstituteAccountRecord[];
  ledgerEntries: InstituteLedgerEntryRecord[];
}

type DetailModalType = "collection" | "outstanding" | "income" | "pnl" | null;

const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "fy", label: "This FY" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom" },
] as const;

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function FinancialDashboardClient({
  initialData,
}: {
  initialData: FinanceOverviewPayload;
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [range, setRange] = React.useState<string>(initialData.range || "month");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [loadingFilter, setLoadingFilter] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [detailModal, setDetailModal] = React.useState<DetailModalType>(null);

  // Reversal modal
  const [reverseTarget, setReverseTarget] = React.useState<FeeReceiptRecord | null>(null);
  const [reverseLoading, setReverseLoading] = React.useState(false);

  const loadRange = async (nextRange: string, from?: string, to?: string) => {
    setRange(nextRange);
    if (nextRange === "custom" && (!from || !to)) return;
    setLoadingFilter(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ range: nextRange });
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`/api/institute/finance/overview?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: FinanceOverviewPayload;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to filter financial overview.");
        return;
      }
      setData(json.data);
    } catch {
      setError("Network error loading financial data.");
    } finally {
      setLoadingFilter(false);
    }
  };

  const handleReverseReceipt = async (reason: string) => {
    if (!reverseTarget) return;
    setReverseLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/institute/finance/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId: reverseTarget.id, reason }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to reverse receipt.");
        return;
      }
      setReverseTarget(null);
      await loadRange(range, customFrom, customTo);
      router.refresh();
    } finally {
      setReverseLoading(false);
    }
  };

  const activeReceipts = data.receipts.filter((r) => r.status !== "cancelled");
  const duePlans = data.plans.filter((p) => p.pendingPaise > 0);
  const incomeEntries = data.ledgerEntries.filter(
    (e) => e.entryType === "income" && e.status === "posted"
  );
  const expenseEntries = data.ledgerEntries.filter(
    (e) => e.entryType === "expense" && e.status === "posted"
  );

  const maxTrend = Math.max(1, ...data.collectionTrend.map((d) => d.amountPaise));
  const maxIncomeExpense = Math.max(
    1,
    ...data.incomeVsExpenseTrend.map((d) => Math.max(d.incomePaise, d.expensePaise))
  );
  const totalMethodPaise = Math.max(
    1,
    Object.values(data.methodTotalsPaise).reduce((a, b) => a + b, 0)
  );
  const collectedVsTotal = Math.max(
    1,
    data.totalFeesCollectedPaise + data.totalOutstandingPaise
  );
  const collectedPct = Math.round(
    (data.totalFeesCollectedPaise / collectedVsTotal) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header + Primary Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Financial Overview
          </h2>
          <p className="text-muted text-xs">
            Live accounting derived from receipts, student fee plans, refunds, and ledger
            accounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/institute/fees/collect"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Collect Fee
          </Link>
          <Link
            href="/institute/fees/students"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Student Fee Ledger
          </Link>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="border-border bg-surface flex flex-wrap items-center gap-2 rounded-xl border p-3">
        <Calendar className="text-muted h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex flex-wrap gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => void loadRange(opt.key, customFrom, customTo)}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                range === opt.key
                  ? "bg-primary text-white"
                  : "bg-background text-muted hover:text-foreground border-border border"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 text-xs"
            />
            <span className="text-muted text-xs">to</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              type="button"
              size="sm"
              loading={loadingFilter}
              onClick={() => void loadRange("custom", customFrom, customTo)}
            >
              Apply
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-800/60"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Clean Enterprise KPI Cards — No Overlap, No Clipping */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                  Fee Collection
                </p>
                <Badge variant="success">{activeReceipts.length} receipts</Badge>
              </div>
              <p className="text-foreground mt-3 text-2xl font-bold tracking-tight tabular-nums">
                {formatInr(data.periodCollectionPaise)}
              </p>
              <p className="text-muted mt-1 text-xs">
                Today: {formatInr(data.todayCollectionPaise)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetailModal("collection")}
              className="text-primary mt-4 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold hover:underline"
            >
              View Details
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                  Outstanding Fees
                </p>
                <Badge variant={duePlans.length > 0 ? "warning" : "success"}>
                  {duePlans.length} students
                </Badge>
              </div>
              <p className="text-danger mt-3 text-2xl font-bold tracking-tight tabular-nums">
                {formatInr(data.totalOutstandingPaise)}
              </p>
              <p className="text-muted mt-1 text-xs">
                Paid in full: {data.paidStudents} student(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetailModal("outstanding")}
              className="text-primary mt-4 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold hover:underline"
            >
              View Details
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                  Other Income
                </p>
                <Badge variant="outline">{incomeEntries.length} entries</Badge>
              </div>
              <p className="text-foreground mt-3 text-2xl font-bold tracking-tight tabular-nums">
                {formatInr(data.otherIncomePaise)}
              </p>
              <p className="text-muted mt-1 text-xs">
                Expenses: {formatInr(data.totalExpensesPaise)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetailModal("income")}
              className="text-primary mt-4 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold hover:underline"
            >
              View Details
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                  Operational P&amp;L
                </p>
                <Badge variant={data.operationalSurplusPaise >= 0 ? "success" : "danger"}>
                  {data.operationalSurplusPaise >= 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" aria-hidden="true" />
                  )}
                  {data.operationalSurplusPaise >= 0 ? "Surplus" : "Deficit"}
                </Badge>
              </div>
              <p
                className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${
                  data.operationalSurplusPaise >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {formatInr(data.operationalSurplusPaise)}
              </p>
              <p className="text-muted mt-1 text-xs">
                Refunds: {formatInr(data.totalRefundedPaise)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetailModal("pnl")}
              className="text-primary mt-4 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold hover:underline"
            >
              View Details
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Real Database-Backed Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* A. Fee Collection Trend */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>Fee Collection Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {data.collectionTrend.length === 0 ? (
              <p className="text-muted py-10 text-center text-xs">
                No fee collections recorded in this date range.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex h-44 items-end gap-2 pt-4">
                  {data.collectionTrend.slice(-14).map((pt) => {
                    const heightPct = Math.max(
                      6,
                      Math.round((pt.amountPaise / maxTrend) * 100)
                    );
                    return (
                      <div
                        key={pt.date}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1"
                        title={`${pt.date}: ${formatInr(pt.amountPaise)}`}
                      >
                        <div className="flex h-36 w-full items-end justify-center">
                          <div
                            className="bg-primary w-full max-w-[28px] rounded-t-md transition-all"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-muted truncate text-[10px]">
                          {pt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* B. Income vs Expenses */}
        <Card className="lg:col-span-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Income vs Expenses</CardTitle>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span className="bg-success h-2.5 w-2.5 rounded-xs" /> Income
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="bg-danger h-2.5 w-2.5 rounded-xs" /> Expenses
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {data.incomeVsExpenseTrend.length === 0 ? (
              <p className="text-muted py-10 text-center text-xs">
                No income or expense activity in this date range.
              </p>
            ) : (
              <div className="flex h-44 items-end gap-2 pt-4">
                {data.incomeVsExpenseTrend.slice(-12).map((pt) => {
                  const incH = Math.max(
                    4,
                    Math.round((pt.incomePaise / maxIncomeExpense) * 100)
                  );
                  const expH = Math.max(
                    pt.expensePaise > 0 ? 4 : 0,
                    Math.round((pt.expensePaise / maxIncomeExpense) * 100)
                  );
                  return (
                    <div
                      key={pt.date}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                      title={`${pt.date} — Income: ${formatInr(pt.incomePaise)}, Expense: ${formatInr(pt.expensePaise)}`}
                    >
                      <div className="flex h-36 w-full items-end justify-center gap-1">
                        <div
                          className="bg-success w-2.5 rounded-t-xs"
                          style={{ height: `${incH}%` }}
                        />
                        <div
                          className="bg-danger w-2.5 rounded-t-xs"
                          style={{ height: `${expH}%` }}
                        />
                      </div>
                      <span className="text-muted truncate text-[10px]">{pt.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* C. Collection vs Outstanding + D. Payment Method Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Collection vs Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-success">
                  Collected ({collectedPct}%): {formatInr(data.totalFeesCollectedPaise)}
                </span>
                <span className="text-danger">
                  Outstanding: {formatInr(data.totalOutstandingPaise)}
                </span>
              </div>
              <div className="bg-surface border-border flex h-4 w-full overflow-hidden rounded-full border">
                <div
                  className="bg-success h-full transition-all"
                  style={{ width: `${collectedPct}%` }}
                />
                <div
                  className="bg-danger/70 h-full transition-all"
                  style={{ width: `${100 - collectedPct}%` }}
                />
              </div>
            </div>

            <div className="border-border space-y-2.5 border-t pt-3">
              <p className="text-muted text-xs font-semibold uppercase">
                Payment Method Breakdown
              </p>
              {Object.keys(data.methodTotalsPaise).length === 0 ? (
                <p className="text-muted text-xs">No payments recorded in range.</p>
              ) : (
                Object.entries(data.methodTotalsPaise).map(([method, paise]) => {
                  const pct = Math.round((paise / totalMethodPaise) * 100);
                  return (
                    <div key={method} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{method.toUpperCase()}</Badge>
                        <span className="text-foreground font-semibold tabular-nums">
                          {formatInr(paise)} ({pct}%)
                        </span>
                      </div>
                      <div className="bg-surface h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Receipts with Reversal Action */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Fee Receipts</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() =>
                downloadCsv(
                  "fee-receipts.csv",
                  data.receipts.map((r) => ({
                    Receipt: r.receiptNumber,
                    Student: r.studentName,
                    StudentID: r.studentCode,
                    Course: r.courseName,
                    Period: r.feePeriod,
                    AmountINR: (r.amountPaise / 100).toFixed(2),
                    Method: r.paymentMethod,
                    Status: r.status,
                    IssuedAt: r.issuedAt,
                  }))
                )
              }
            >
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {data.receipts.length === 0 ? (
              <p className="text-muted text-xs">No receipts issued yet.</p>
            ) : (
              <div className="divide-border divide-y text-xs">
                {data.receipts.slice(0, 8).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-foreground font-semibold">
                          {r.receiptNumber} · {r.studentName}
                        </p>
                        {r.status === "cancelled" && (
                          <Badge variant="danger">Reversed</Badge>
                        )}
                      </div>
                      <p className="text-muted">
                        {r.courseName} · {r.feePeriod} · {r.paymentMethod.toUpperCase()} ·{" "}
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
                        +{formatInr(r.amountPaise)}
                      </span>
                      {r.status !== "cancelled" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Reverse / Cancel Receipt"
                          onClick={() => setReverseTarget(r)}
                        >
                          <RotateCcw
                            className="text-danger h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Details Modals (Module 6) */}
      <ResponsiveFormModal
        open={detailModal === "collection"}
        onClose={() => setDetailModal(null)}
        title="Fee Collection Details"
        subtitle={`${activeReceipts.length} active receipt(s) · Total: ${formatInr(data.periodCollectionPaise)}`}
        maxWidthClass="sm:max-w-4xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="border-border bg-surface rounded-xl border p-3">
              <p className="text-muted text-[11px]">Period Total</p>
              <p className="text-foreground text-lg font-bold tabular-nums">
                {formatInr(data.periodCollectionPaise)}
              </p>
            </div>
            <div className="border-border bg-surface rounded-xl border p-3">
              <p className="text-muted text-[11px]">Today&apos;s Collection</p>
              <p className="text-success text-lg font-bold tabular-nums">
                {formatInr(data.todayCollectionPaise)}
              </p>
            </div>
            <div className="border-border bg-surface rounded-xl border p-3">
              <p className="text-muted text-[11px]">Active Receipts</p>
              <p className="text-foreground text-lg font-bold">{activeReceipts.length}</p>
            </div>
          </div>

          <div className="border-border max-h-80 overflow-auto rounded-xl border">
            <table className="w-full text-left text-xs">
              <thead className="border-border bg-surface text-muted border-b">
                <tr>
                  <th className="px-3 py-2">Receipt</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {data.receipts.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-mono">{r.receiptNumber}</td>
                    <td className="px-3 py-2">
                      {r.studentName} ({r.studentCode})
                    </td>
                    <td className="px-3 py-2">{r.feePeriod}</td>
                    <td className="px-3 py-2 uppercase">{r.paymentMethod}</td>
                    <td className="px-3 py-2 font-semibold tabular-nums">
                      {formatInr(r.amountPaise)}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === "cancelled" ? (
                        <Badge variant="danger">Reversed</Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReverseTarget(r)}
                        >
                          Reverse
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ResponsiveFormModal>

      <ResponsiveFormModal
        open={detailModal === "outstanding"}
        onClose={() => setDetailModal(null)}
        title="Outstanding Fee Details"
        subtitle={`${duePlans.length} student(s) with pending balances · Total: ${formatInr(data.totalOutstandingPaise)}`}
        maxWidthClass="sm:max-w-4xl"
      >
        <div className="border-border max-h-96 overflow-auto rounded-xl border">
          <table className="w-full text-left text-xs">
            <thead className="border-border bg-surface text-muted border-b">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Overdue</th>
                <th className="px-3 py-2">Current Due</th>
                <th className="px-3 py-2">Upcoming</th>
                <th className="px-3 py-2">Total Pending</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {duePlans.map((p) => {
                const b = computeMonthlyDueBreakdown(p);
                return (
                  <tr key={p.id}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/institute/fees/students?student=${encodeURIComponent(p.studentId)}`}
                        className="text-primary font-semibold hover:underline"
                      >
                        {p.studentName} ({p.studentCode})
                      </Link>
                    </td>
                    <td className="px-3 py-2">{p.courseName}</td>
                    <td className="text-danger px-3 py-2 font-semibold tabular-nums">
                      {formatInr(b.overduePaise)}
                    </td>
                    <td className="text-warning px-3 py-2 font-semibold tabular-nums">
                      {formatInr(b.dueThisMonthPaise)}
                    </td>
                    <td className="text-muted px-3 py-2 tabular-nums">
                      {formatInr(b.upcomingPaise)}
                    </td>
                    <td className="text-foreground px-3 py-2 font-bold tabular-nums">
                      {formatInr(p.pendingPaise)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ResponsiveFormModal>

      <ResponsiveFormModal
        open={detailModal === "income"}
        onClose={() => setDetailModal(null)}
        title="Other Income Details"
        subtitle={`${incomeEntries.length} non-fee income entry/entries · Total: ${formatInr(data.otherIncomePaise)}`}
        maxWidthClass="sm:max-w-3xl"
      >
        <div className="border-border max-h-80 overflow-auto rounded-xl border">
          <table className="w-full text-left text-xs">
            <thead className="border-border bg-surface text-muted border-b">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {incomeEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted px-3 py-6 text-center">
                    No non-fee income entries recorded.
                  </td>
                </tr>
              ) : (
                incomeEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 font-mono">{e.date}</td>
                    <td className="px-3 py-2">{e.categoryName}</td>
                    <td className="px-3 py-2">{e.description}</td>
                    <td className="text-success px-3 py-2 font-semibold tabular-nums">
                      {formatInr(e.amountPaise)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ResponsiveFormModal>

      <ResponsiveFormModal
        open={detailModal === "pnl"}
        onClose={() => setDetailModal(null)}
        title="Operational Profit & Loss Details"
        subtitle="Cash-basis recognized income minus refunds and posted expenses."
        maxWidthClass="sm:max-w-3xl"
      >
        <div className="space-y-4">
          <div className="border-border bg-surface space-y-2 rounded-xl border p-4 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Fee Collections (Recognized)</span>
              <span className="text-success font-semibold tabular-nums">
                +{formatInr(data.periodCollectionPaise)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Other Income</span>
              <span className="text-success font-semibold tabular-nums">
                +{formatInr(data.otherIncomePaise)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Fee Refunds</span>
              <span className="text-danger font-semibold tabular-nums">
                -{formatInr(data.totalRefundedPaise)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Operating Expenses</span>
              <span className="text-danger font-semibold tabular-nums">
                -{formatInr(data.totalExpensesPaise)}
              </span>
            </div>
            <div className="border-border flex justify-between border-t pt-2 text-sm font-bold">
              <span>Net Operational P&amp;L</span>
              <span
                className={
                  data.operationalSurplusPaise >= 0 ? "text-success" : "text-danger"
                }
              >
                {formatInr(data.operationalSurplusPaise)}
              </span>
            </div>
          </div>

          <div className="border-border max-h-60 overflow-auto rounded-xl border">
            <table className="w-full text-left text-xs">
              <thead className="border-border bg-surface text-muted border-b">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Expense Category</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {expenseEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted px-3 py-6 text-center">
                      No expenses recorded.
                    </td>
                  </tr>
                ) : (
                  expenseEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 font-mono">{e.date}</td>
                      <td className="px-3 py-2">{e.categoryName}</td>
                      <td className="px-3 py-2">{e.description}</td>
                      <td className="text-danger px-3 py-2 font-semibold tabular-nums">
                        {formatInr(e.amountPaise)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ResponsiveFormModal>

      {/* Receipt Reversal Confirmation Modal */}
      <ConfirmDeleteModal
        open={Boolean(reverseTarget)}
        onClose={() => setReverseTarget(null)}
        onConfirm={(reason) => handleReverseReceipt(reason)}
        title="Reverse Fee Receipt"
        recordLabel={
          reverseTarget
            ? `${reverseTarget.receiptNumber} · ${reverseTarget.studentName} (${formatInr(reverseTarget.amountPaise)})`
            : ""
        }
        affectedSummary="Marks this receipt as cancelled/reversed without erasing history, restores the student's outstanding balance, updates dashboard totals, and logs an immutable audit entry."
        confirmLabel="Confirm Reversal"
        loading={reverseLoading}
      />
    </div>
  );
}
