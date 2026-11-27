"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Build unified list: existing plans + any active students without a plan yet
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
    }> = plans.map((p) => ({
      key: `plan:${p.id}`,
      feePlanId: p.id,
      studentId: p.studentId,
      studentCode: p.studentCode,
      studentName: p.studentName,
      courseName: p.courseName,
      plan: p,
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
        });
      }
    }
    return items;
  }, [plans, students]);

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

  const [totalFeeRupees, setTotalFeeRupees] = React.useState("");
  const [amountRupees, setAmountRupees] = React.useState("");
  const [discountRupees, setDiscountRupees] = React.useState("0");
  const [method, setMethod] = React.useState<FeePaymentMethod>("cash");
  const [feePeriod, setFeePeriod] = React.useState("Installment");
  const [reference, setReference] = React.useState("");
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<FeeReceiptRecord | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    setLoading(true);
    setError(null);
    setReceipt(null);
    try {
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
                  : {}),
              }),
          amountRupees: Number(amountRupees),
          discountRupees: Number(discountRupees || 0),
          method,
          feePeriod,
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
      setAmountRupees("");
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
      <Card className="lg:col-span-7">
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
                className="border-border bg-background w-full max-w-sm animate-[scaleIn_0.2s_ease-out] rounded-2xl border p-6 text-center shadow-2xl"
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
              onChange={(e) => setSelectedKey(e.target.value)}
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
                        ? `${o.studentName} (${o.studentCode}) — Due ₹${(o.plan.pendingPaise / 100).toFixed(2)}`
                        : `${o.studentName} (${o.studentCode}) — ${o.courseName} (New Fee Plan)`,
                      value: o.key,
                    }))
              }
            />

            {selectedEntry?.plan ? (
              <div className="border-border bg-surface grid grid-cols-3 gap-3 rounded-xl border p-3.5 text-xs">
                <div>
                  <p className="text-muted">Total Payable</p>
                  <p className="text-foreground mt-0.5 font-bold tabular-nums">
                    ₹
                    {(
                      (selectedEntry.plan.totalFeePaise -
                        selectedEntry.plan.discountPaise) /
                      100
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Paid So Far</p>
                  <p className="text-success mt-0.5 font-bold tabular-nums">
                    ₹{(selectedEntry.plan.paidPaise / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Outstanding</p>
                  <p className="text-danger mt-0.5 font-bold tabular-nums">
                    ₹{(selectedEntry.plan.pendingPaise / 100).toFixed(2)}
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Amount Collecting Now (₹)"
                type="number"
                min={1}
                step="1"
                required
                placeholder="e.g. 1500"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
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
                onChange={(e) => setMethod(e.target.value as FeePaymentMethod)}
                options={[
                  { label: "Cash", value: "cash" },
                  { label: "UPI", value: "upi" },
                  { label: "Bank Transfer", value: "bank_transfer" },
                  { label: "Card", value: "card" },
                  { label: "Other", value: "other" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Fee Period / Installment"
                value={feePeriod}
                onChange={(e) => setFeePeriod(e.target.value)}
              />
              <Input
                label="Transaction Reference"
                placeholder="UPI Ref / Cheque No"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <Select
                label="Deposit Account (Optional)"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={
                  accounts.length === 0
                    ? [{ label: "Default Cash/Bank Ledger", value: "" }]
                    : accounts.map((a) => ({
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

      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Collection Integrity Checklist</CardTitle>
        </CardHeader>
        <CardContent className="text-muted space-y-2.5 text-xs leading-relaxed">
          <p>&bull; Automatically initializes a student fee plan if none exists yet.</p>
          <p>&bull; Updates student fee plan paid &amp; pending balances atomically.</p>
          <p>&bull; Generates a sequential, immutable receipt number.</p>
          <p>&bull; Credits the selected Cash/Bank account ledger if configured.</p>
          <p>&bull; Sends an automatic Fee Receipt notification to the Student Portal.</p>
        </CardContent>
      </Card>
    </div>
  );
}
