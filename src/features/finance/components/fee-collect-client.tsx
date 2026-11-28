"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarCheck, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeMonthlyDueBreakdown } from "@/lib/finance/monthly-dues";
import type { StudentFeePlanRecord } from "@/types/academic";
import type {
  FeePaymentMethod,
  FeeReceiptRecord,
  InstituteAccountRecord,
} from "@/types/finance";

export interface FeeCollectStudentOption {
  id: string;
  studentId: string;
  fullName: string;
  courseName: string;
  admissionDate?: string | undefined;
  courseFeePaise?: number | undefined;
  monthlyFeePaise?: number | undefined;
  durationMonths?: number | undefined;
  admissionFeePaise?: number | undefined;
}

export function FeeCollectClient({
  plans,
  accounts,
  students = [],
}: {
  plans: StudentFeePlanRecord[];
  accounts: InstituteAccountRecord[];
  students?: FeeCollectStudentOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const studentMap = React.useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const unifiedOptions = React.useMemo(() => {
    const planByStudentId = new Map(plans.map((p) => [p.studentId, p]));
    const items: Array<{
      key: string;
      feePlanId: string | null;
      studentId: string;
      studentCode: string;
      studentName: string;
      courseName: string;
      plan: StudentFeePlanRecord | null;
      studentMeta: FeeCollectStudentOption | undefined;
    }> = plans.map((p) => ({
      key: `plan:${p.id}`,
      feePlanId: p.id,
      studentId: p.studentId,
      studentCode: p.studentCode,
      studentName: p.studentName,
      courseName: p.courseName,
      plan: p,
      studentMeta: studentMap.get(p.studentId),
    }));

    for (const st of students) {
      if (!planByStudentId.has(st.id)) {
        items.push({
          key: `student:${st.id}`,
          feePlanId: null,
          studentId: st.id,
          studentCode: st.studentId,
          studentName: st.fullName,
          courseName: st.courseName,
          plan: null,
          studentMeta: st,
        });
      }
    }
    return items;
  }, [plans, students, studentMap]);

  const filteredOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unifiedOptions;
    return unifiedOptions.filter(
      (o) =>
        o.studentName.toLowerCase().includes(q) ||
        o.studentCode.toLowerCase().includes(q) ||
        o.courseName.toLowerCase().includes(q)
    );
  }, [unifiedOptions, query]);

  const [selectedKey, setSelectedKey] = React.useState(() => {
    const withDue = unifiedOptions.find((o) => o.plan && o.plan.pendingPaise > 0);
    return withDue?.key ?? unifiedOptions[0]?.key ?? "";
  });

  const selectedEntry =
    unifiedOptions.find((o) => o.key === selectedKey) ?? filteredOptions[0] ?? null;

  // Build synthetic plan preview if student has no plan yet so monthly breakdown works seamlessly
  const effectivePlan = React.useMemo<StudentFeePlanRecord | null>(() => {
    if (!selectedEntry) return null;
    if (selectedEntry.plan) return selectedEntry.plan;
    const meta = selectedEntry.studentMeta;
    const total = meta?.courseFeePaise ?? 0;
    if (total <= 0) return null;
    return {
      id: "preview",
      instituteId: "",
      studentId: selectedEntry.studentId,
      studentCode: selectedEntry.studentCode,
      studentName: selectedEntry.studentName,
      courseName: selectedEntry.courseName,
      totalFeePaise: total,
      ...(meta?.monthlyFeePaise !== undefined
        ? { monthlyFeePaise: meta.monthlyFeePaise }
        : {}),
      ...(meta?.durationMonths !== undefined
        ? { durationMonths: meta.durationMonths }
        : {}),
      ...(meta?.admissionFeePaise !== undefined
        ? { admissionFeePaise: meta.admissionFeePaise }
        : {}),
      startDate: meta?.admissionDate || new Date().toISOString(),
      discountPaise: 0,
      paidPaise: 0,
      pendingPaise: total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [selectedEntry]);

  const breakdown = React.useMemo(
    () => (effectivePlan ? computeMonthlyDueBreakdown(effectivePlan) : null),
    [effectivePlan]
  );

  const [paymentMode, setPaymentMode] = React.useState<"months" | "custom">("months");
  const [selectedInstallmentIndices, setSelectedInstallmentIndices] = React.useState<
    number[]
  >([]);
  const [totalFeeRupees, setTotalFeeRupees] = React.useState("");
  const [customAmountRupees, setCustomAmountRupees] = React.useState("");
  const [discountRupees, setDiscountRupees] = React.useState("0");
  const [method, setMethod] = React.useState<FeePaymentMethod>("cash");
  const [feePeriodCustom, setFeePeriodCustom] = React.useState("Installment");
  const [reference, setReference] = React.useState("");
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<FeeReceiptRecord | null>(null);

  const unpaidInstallments = React.useMemo(
    () => (breakdown ? breakdown.installments.filter((i) => i.pendingPaise > 0) : []),
    [breakdown]
  );

  const selectedInstallments = unpaidInstallments.filter((i) =>
    selectedInstallmentIndices.includes(i.index)
  );

  const monthsSelectedPaise = selectedInstallments.reduce(
    (sum, i) => sum + i.pendingPaise,
    0
  );

  const effectiveAmountRupees =
    paymentMode === "months" && selectedInstallments.length > 0
      ? String(Math.round(monthsSelectedPaise / 100))
      : customAmountRupees;

  const effectiveFeePeriod =
    paymentMode === "months" && selectedInstallments.length > 0
      ? selectedInstallments.map((i) => i.label).join(", ")
      : feePeriodCustom;

  const currentOutstandingPaise =
    selectedEntry?.plan?.pendingPaise ?? selectedEntry?.studentMeta?.courseFeePaise ?? 0;
  const payingPaise = Math.max(0, Math.round((Number(effectiveAmountRupees) || 0) * 100));
  const discountPaise = Math.max(0, Math.round((Number(discountRupees) || 0) * 100));
  const remainingAfterPaise = Math.max(
    0,
    currentOutstandingPaise - payingPaise - discountPaise
  );

  const handleSelectStudent = (nextKey: string) => {
    setSelectedKey(nextKey);
    setSelectedInstallmentIndices([]);
    setCustomAmountRupees("");
    setDiscountRupees("0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    const amt = Number(effectiveAmountRupees);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Select at least one month or enter a valid collection amount.");
      return;
    }

    setLoading(true);
    setError(null);
    setReceipt(null);
    try {
      const fallbackTotal =
        selectedEntry.studentMeta?.courseFeePaise &&
        selectedEntry.studentMeta.courseFeePaise > 0
          ? selectedEntry.studentMeta.courseFeePaise / 100
          : undefined;

      const res = await fetch("/api/institute/finance/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(selectedEntry.feePlanId
            ? { feePlanId: selectedEntry.feePlanId }
            : {
                studentId: selectedEntry.studentId,
                ...(totalFeeRupees.trim()
                  ? { totalFeeRupees: Number(totalFeeRupees) }
                  : fallbackTotal
                    ? { totalFeeRupees: fallbackTotal }
                    : {}),
              }),
          amountRupees: amt,
          discountRupees: Number(discountRupees || 0),
          method,
          feePeriod: effectiveFeePeriod || "Installment",
          reference: reference || undefined,
          accountId: accountId || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { receipt: FeeReceiptRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to record fee collection.");
        return;
      }
      setReceipt(json.data.receipt);
      setSelectedInstallmentIndices([]);
      setCustomAmountRupees("");
      setTotalFeeRupees("");
      setDiscountRupees("0");
      setReference("");
      router.refresh();
    } catch {
      setError("Network error while recording fee collection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardTitle>Collect Student Fee &amp; Issue Receipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-800/70 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          {receipt ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Fee Collection Confirmed"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
              onClick={() => setReceipt(null)}
            >
              <div
                className="border-border bg-background w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-success-soft text-success mx-auto flex h-16 w-16 animate-bounce items-center justify-center rounded-full">
                  <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
                </div>
                <h3 className="text-foreground mt-4 text-lg font-bold">Fee Collected!</h3>
                <p className="text-muted mt-1 text-xs">
                  Receipt{" "}
                  <span className="text-foreground font-mono font-semibold">
                    {receipt.receiptNumber}
                  </span>
                </p>
                <div className="border-border bg-surface mt-4 space-y-1.5 rounded-xl border p-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Student</span>
                    <span className="text-foreground font-semibold">
                      {receipt.studentName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Period</span>
                    <span className="text-foreground font-medium">
                      {receipt.feePeriod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Amount Paid</span>
                    <span className="text-success font-bold tabular-nums">
                      ₹{(receipt.amountPaise / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Remaining Dues</span>
                    <span className="text-foreground font-semibold tabular-nums">
                      ₹{(receipt.remainingDuesPaise / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  fullWidth
                  className="mt-5"
                  onClick={() => setReceipt(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : null}

          <Input
            label="Search Student (ID, Name, Course)"
            placeholder="Type student name or ID..."
            leftAddon={<Search className="h-4 w-4" aria-hidden="true" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Select Student"
              value={selectedEntry?.key ?? ""}
              onChange={(e) => handleSelectStudent(e.target.value)}
              options={
                filteredOptions.length === 0
                  ? [
                      {
                        label: "No active students found — add students first",
                        value: "",
                      },
                    ]
                  : filteredOptions.map((o) => ({
                      label: o.plan
                        ? `${o.studentName} (${o.studentCode}) — ${o.courseName} · Due ₹${(o.plan.pendingPaise / 100).toFixed(2)}`
                        : `${o.studentName} (${o.studentCode}) — ${o.courseName}${
                            o.studentMeta?.courseFeePaise
                              ? ` · Course Fee ₹${(o.studentMeta.courseFeePaise / 100).toFixed(0)}`
                              : " (New Fee Plan)"
                          }`,
                      value: o.key,
                    }))
              }
            />

            {/* Student Course Fee Summary */}
            {effectivePlan ? (
              <div className="border-border bg-surface grid grid-cols-2 gap-3 rounded-xl border p-3.5 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-muted">Course</p>
                  <p className="text-foreground mt-0.5 font-semibold">
                    {effectivePlan.courseName}
                  </p>
                  {effectivePlan.monthlyFeePaise ? (
                    <p className="text-muted text-[11px]">
                      ₹{(effectivePlan.monthlyFeePaise / 100).toFixed(0)}/mo &times;{" "}
                      {effectivePlan.durationMonths}m
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-muted">Total Payable</p>
                  <p className="text-foreground mt-0.5 font-bold tabular-nums">
                    ₹
                    {(
                      (effectivePlan.totalFeePaise - effectivePlan.discountPaise) /
                      100
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Paid So Far</p>
                  <p className="text-success mt-0.5 font-bold tabular-nums">
                    ₹{(effectivePlan.paidPaise / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Outstanding</p>
                  <p className="text-danger mt-0.5 font-bold tabular-nums">
                    ₹{(effectivePlan.pendingPaise / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            ) : selectedEntry ? (
              <div className="border-border bg-surface rounded-xl border p-3.5">
                <Input
                  label="Total Course Fee (₹) — creates student's fee plan automatically"
                  type="number"
                  min={1}
                  step="1"
                  placeholder="Leave blank to match collected amount"
                  value={totalFeeRupees}
                  onChange={(e) => setTotalFeeRupees(e.target.value)}
                />
              </div>
            ) : null}

            {/* Fee Period Mode Tabs */}
            {unpaidInstallments.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                    <CalendarCheck className="text-primary h-4 w-4" aria-hidden="true" />
                    Fee Period Selection
                  </span>
                  <div className="flex gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMode("months")}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 font-semibold ${
                        paymentMode === "months"
                          ? "bg-primary text-white"
                          : "border-border bg-surface text-muted border"
                      }`}
                    >
                      Select Months ({selectedInstallments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode("custom")}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 font-semibold ${
                        paymentMode === "custom"
                          ? "bg-primary text-white"
                          : "border-border bg-surface text-muted border"
                      }`}
                    >
                      Partial / Custom Amount
                    </button>
                  </div>
                </div>

                {paymentMode === "months" && (
                  <div className="border-border max-h-60 overflow-auto rounded-xl border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-border bg-surface text-muted border-b">
                        <tr>
                          <th className="px-3 py-2">Select</th>
                          <th className="px-3 py-2">Period</th>
                          <th className="px-3 py-2">Pending</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-border divide-y">
                        {unpaidInstallments.map((inst) => {
                          const checked = selectedInstallmentIndices.includes(inst.index);
                          return (
                            <tr
                              key={inst.index}
                              onClick={() => {
                                setSelectedInstallmentIndices((prev) =>
                                  prev.includes(inst.index)
                                    ? prev.filter((x) => x !== inst.index)
                                    : [...prev, inst.index]
                                );
                              }}
                              className={`cursor-pointer transition-colors ${
                                checked ? "bg-primary-soft/50" : "hover:bg-surface"
                              }`}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => undefined}
                                />
                              </td>
                              <td className="px-3 py-2 font-medium">{inst.label}</td>
                              <td className="px-3 py-2 font-semibold tabular-nums">
                                ₹{(inst.pendingPaise / 100).toFixed(2)}
                              </td>
                              <td className="px-3 py-2">
                                <Badge
                                  variant={
                                    inst.status === "OVERDUE"
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Amount Collecting Now (₹)"
                type="number"
                min={1}
                step="1"
                required
                placeholder="e.g. 1500"
                value={effectiveAmountRupees}
                onChange={(e) => {
                  setPaymentMode("custom");
                  setCustomAmountRupees(e.target.value);
                }}
              />
              <Input
                label="Discount (₹)"
                type="number"
                min={0}
                step="1"
                value={discountRupees}
                onChange={(e) => setDiscountRupees(e.target.value)}
              />
              <Select
                label="Payment Method"
                value={method}
                onChange={(e) => {
                  const next = e.target.value as FeePaymentMethod;
                  setMethod(next);
                  const wantType = next === "cash" ? "cash" : "bank";
                  const match = accounts.find(
                    (a) => a.accountType === wantType && a.status === "active"
                  );
                  if (match) setAccountId(match.id);
                }}
                options={[
                  { label: "Cash", value: "cash" },
                  { label: "Bank", value: "bank_transfer" },
                  { label: "UPI", value: "upi" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Fee Period / Installment"
                value={effectiveFeePeriod}
                onChange={(e) => {
                  setPaymentMode("custom");
                  setFeePeriodCustom(e.target.value);
                }}
              />
              <Input
                label="Transaction Reference"
                placeholder="UPI Ref / Cheque No"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <Select
                label="Deposit Account (Cash / Bank)"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={
                  accounts.length === 0
                    ? [{ label: "Default Cash/Bank Account", value: "" }]
                    : accounts
                        .filter((a) => a.status === "active")
                        .map((a) => ({
                          label: `${a.name} (${a.accountType.toUpperCase()})`,
                          value: a.id,
                        }))
                }
              />
            </div>

            <Button type="submit" loading={loading} fullWidth disabled={!selectedEntry}>
              Confirm Fee Collection &amp; Generate Receipt
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Live Collection Summary Sidebar */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Collection Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {selectedEntry ? (
            <div className="border-border bg-surface space-y-2 rounded-xl border p-4">
              <div className="flex justify-between">
                <span className="text-muted">Student</span>
                <span className="text-foreground font-semibold">
                  {selectedEntry.studentName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Course</span>
                <span className="text-foreground">{selectedEntry.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Selected Period</span>
                <span className="text-foreground max-w-[160px] truncate font-medium">
                  {effectiveFeePeriod || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Collecting Now</span>
                <span className="text-success font-bold tabular-nums">
                  ₹{(payingPaise / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Discount</span>
                <span className="text-foreground tabular-nums">
                  ₹{(discountPaise / 100).toFixed(2)}
                </span>
              </div>
              <div className="border-border flex justify-between border-t pt-2 font-bold">
                <span className="text-muted">Remaining Balance</span>
                <span className="text-danger tabular-nums">
                  ₹{(remainingAfterPaise / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ) : null}
          <div className="text-muted space-y-1.5 leading-relaxed">
            <p>&bull; Automatically initializes a student fee plan from Course fees.</p>
            <p>&bull; Partial payments never mark a month fully paid.</p>
            <p>&bull; Issues an immutable sequential receipt &amp; updates ledgers.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
