"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeePaymentRecord, StudentFeePlanRecord } from "@/types/academic";
import type { StudentRecord } from "@/types/domain";

export function FeesClient({
  students,
  initialPlans,
  initialPayments,
  canWrite,
}: {
  students: StudentRecord[];
  initialPlans: StudentFeePlanRecord[];
  initialPayments: FeePaymentRecord[];
  canWrite: boolean;
}) {
  const [plans, setPlans] = React.useState(initialPlans);
  const [payments, setPayments] = React.useState(initialPayments);

  const [studentId, setStudentId] = React.useState(students[0]?.id ?? "");
  const [totalFeeRupees, setTotalFeeRupees] = React.useState("12000");
  const [discountRupees, setDiscountRupees] = React.useState("0");

  const [selectedPlanId, setSelectedPlanId] = React.useState(initialPlans[0]?.id ?? "");
  const [amountRupees, setAmountRupees] = React.useState("3000");
  const [paymentMode, setPaymentMode] = React.useState<
    "cash" | "upi" | "bank_transfer" | "card"
  >("upi");
  const [note, setNote] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_plan",
          studentId,
          totalFeeRupees: Number(totalFeeRupees),
          discountRupees: Number(discountRupees),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { plan: StudentFeePlanRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create fee plan.");
        return;
      }
      setPlans((prev) => [json.data!.plan, ...prev]);
      setSelectedPlanId(json.data.plan.id);
      setMessage("Student fee plan created.");
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "collect_payment",
          feePlanId: selectedPlanId,
          amountRupees: Number(amountRupees),
          paymentMode,
          note,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { plan: StudentFeePlanRecord; payment: FeePaymentRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to collect fee.");
        return;
      }
      setPlans((prev) =>
        prev.map((p) => (p.id === json.data!.plan.id ? json.data!.plan : p))
      );
      setPayments((prev) => [json.data!.payment, ...prev]);
      setNote("");
      setMessage(`Payment collected. Receipt: ${json.data.payment.receiptNo}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {canWrite && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Student Fee Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePlan} className="space-y-3.5">
                <Select
                  label="Student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  options={
                    students.length > 0
                      ? students.map((s) => ({
                          label: `${s.fullName} (${s.studentCode})`,
                          value: s.id,
                        }))
                      : [{ label: "No students admitted", value: "" }]
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Total Course Fee (₹)"
                    type="number"
                    min="0"
                    value={totalFeeRupees}
                    onChange={(e) => setTotalFeeRupees(e.target.value)}
                    required
                  />
                  <Input
                    label="Discount (₹)"
                    type="number"
                    min="0"
                    value={discountRupees}
                    onChange={(e) => setDiscountRupees(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  disabled={students.length === 0}
                >
                  Create Fee Plan
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collect Student Fee</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCollect} className="space-y-3.5">
                <Select
                  label="Student Fee Plan"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  options={
                    plans.filter((p) => p.pendingPaise > 0).length > 0
                      ? plans
                          .filter((p) => p.pendingPaise > 0)
                          .map((p) => ({
                            label: `${p.studentName} — Due ₹${(p.pendingPaise / 100).toFixed(2)}`,
                            value: p.id,
                          }))
                      : [{ label: "No pending fee plans", value: "" }]
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Amount (₹)"
                    type="number"
                    min="1"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    required
                  />
                  <Select
                    label="Payment Mode"
                    value={paymentMode}
                    onChange={(e) =>
                      setPaymentMode(
                        e.target.value as "cash" | "upi" | "bank_transfer" | "card"
                      )
                    }
                    options={[
                      { label: "UPI", value: "upi" },
                      { label: "Cash", value: "cash" },
                      { label: "Bank Transfer", value: "bank_transfer" },
                      { label: "Card", value: "card" },
                    ]}
                  />
                </div>
                <Input
                  label="Note / Reference"
                  placeholder="Installment #1"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  disabled={plans.filter((p) => p.pendingPaise > 0).length === 0}
                >
                  Record Payment &amp; Generate Receipt
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Student Fee Plans &amp; Pending Dues</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-muted text-sm">No student fee plans created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border text-muted border-b text-xs uppercase">
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Discount</th>
                    <th className="py-2 pr-4">Paid</th>
                    <th className="py-2">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{p.studentName}</p>
                        <p className="text-muted text-xs">
                          {p.studentCode} &bull; {p.courseName}
                        </p>
                      </td>
                      <td className="py-2.5 pr-4">
                        ₹{(p.totalFeePaise / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-4">
                        ₹{(p.discountPaise / 100).toFixed(2)}
                      </td>
                      <td className="text-success py-2.5 pr-4">
                        ₹{(p.paidPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5">
                        <Badge variant={p.pendingPaise === 0 ? "success" : "warning"}>
                          ₹{(p.pendingPaise / 100).toFixed(2)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Institute Fee Collection Receipts</CardTitle>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
            onClick={() => window.print()}
          >
            Print Ledger
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted text-sm">No fee receipts issued yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border text-muted border-b text-xs uppercase">
                    <th className="py-2 pr-4">Receipt No</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {payments.map((pmt) => (
                    <tr key={pmt.id}>
                      <td className="py-2.5 pr-4 font-mono text-xs font-medium">
                        {pmt.receiptNo}
                      </td>
                      <td className="text-muted py-2.5 pr-4 font-mono text-xs">
                        {pmt.paidAt.slice(0, 10)}
                      </td>
                      <td className="py-2.5 pr-4">{pmt.studentName}</td>
                      <td className="py-2.5 pr-4 text-xs uppercase">{pmt.paymentMode}</td>
                      <td className="text-success py-2.5 font-semibold">
                        ₹{(pmt.amountPaise / 100).toFixed(2)}
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
