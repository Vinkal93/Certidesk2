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

export function FeeCollectClient({
  plans,
  accounts,
}: {
  plans: StudentFeePlanRecord[];
  accounts: InstituteAccountRecord[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [selectedPlanId, setSelectedPlanId] = React.useState(
    plans.find((p) => p.pendingPaise > 0)?.id ?? plans[0]?.id ?? ""
  );
  const [amountRupees, setAmountRupees] = React.useState("");
  const [discountRupees, setDiscountRupees] = React.useState("0");
  const [method, setMethod] = React.useState<FeePaymentMethod>("cash");
  const [feePeriod, setFeePeriod] = React.useState("Installment");
  const [reference, setReference] = React.useState("");
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<FeeReceiptRecord | null>(null);

  const filteredPlans = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        p.studentCode.toLowerCase().includes(q) ||
        p.courseName.toLowerCase().includes(q)
    );
  }, [plans, query]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    setLoading(true);
    setError(null);
    setReceipt(null);
    try {
      const res = await fetch("/api/institute/finance/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feePlanId: selectedPlanId,
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
              className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
          {receipt ? (
            <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Fee collected! Receipt <strong>{receipt.receiptNumber}</strong> issued for{" "}
                <strong>{receipt.studentName}</strong> (₹
                {(receipt.amountPaise / 100).toFixed(2)}). Remaining dues: ₹
                {(receipt.remainingDuesPaise / 100).toFixed(2)}.
              </span>
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
              label="Select Student Fee Plan"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              options={
                filteredPlans.length === 0
                  ? [{ label: "No matching student fee plans", value: "" }]
                  : filteredPlans.map((p) => ({
                      label: `${p.studentName} (${p.studentCode}) — Due ₹${(p.pendingPaise / 100).toFixed(2)}`,
                      value: p.id,
                    }))
              }
            />

            {selectedPlan ? (
              <div className="border-border bg-surface grid grid-cols-3 gap-3 rounded-xl border p-3.5 text-xs">
                <div>
                  <p className="text-muted">Total Payable</p>
                  <p className="text-foreground mt-0.5 font-bold tabular-nums">
                    ₹
                    {(
                      (selectedPlan.totalFeePaise - selectedPlan.discountPaise) /
                      100
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Paid So Far</p>
                  <p className="text-success mt-0.5 font-bold tabular-nums">
                    ₹{(selectedPlan.paidPaise / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Outstanding</p>
                  <p className="text-danger mt-0.5 font-bold tabular-nums">
                    ₹{(selectedPlan.pendingPaise / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Amount (₹)"
                type="number"
                min={1}
                step="1"
                required
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
                label="Deposit Account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={
                  accounts.length === 0
                    ? [{ label: "No Cash/Bank account configured", value: "" }]
                    : accounts.map((a) => ({
                        label: `${a.name} (${a.accountType.toUpperCase()})`,
                        value: a.id,
                      }))
                }
              />
            </div>

            <Button type="submit" loading={loading} fullWidth disabled={!selectedPlanId}>
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
          <p>• Updates student fee plan paid &amp; pending balances atomically.</p>
          <p>• Generates a sequential, immutable receipt number.</p>
          <p>• Credits the selected Cash/Bank account ledger if configured.</p>
          <p>• Sends an automatic Fee Receipt notification to the Student Portal.</p>
          <p>• Never creates duplicate manual income entries for fee payments.</p>
        </CardContent>
      </Card>
    </div>
  );
}
