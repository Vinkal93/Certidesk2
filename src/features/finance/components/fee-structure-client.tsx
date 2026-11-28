"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeeReminderSettingsClient } from "@/features/finance/components/fee-reminder-settings-client";
import type { BatchRecord, CourseRecord } from "@/types/academic";
import type {
  FeeReminderDashboardSummary,
  FeeReminderRuleRecord,
} from "@/types/fee-reminder";
import type { FeeFrequency, FeeStructureRecord } from "@/types/finance";

export function FeeStructureClient({
  structures,
  courses,
  batches,
  reminderRules,
  reminderDashboard,
}: {
  structures: FeeStructureRecord[];
  courses: CourseRecord[];
  batches: BatchRecord[];
  reminderRules: FeeReminderRuleRecord[];
  reminderDashboard: FeeReminderDashboardSummary;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"structures" | "reminders">(
    "structures"
  );
  const [name, setName] = React.useState("");
  const [courseName, setCourseName] = React.useState("");
  const [frequency, setFrequency] = React.useState<FeeFrequency>("installment");
  const [amountRupees, setAmountRupees] = React.useState("6000");
  const [admissionFeeRupees, setAdmissionFeeRupees] = React.useState("500");
  const [lateFeeRupees, setLateFeeRupees] = React.useState("0");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/finance/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          courseName,
          frequency,
          amountRupees: Number(amountRupees),
          admissionFeeRupees: Number(admissionFeeRupees || 0),
          lateFeeRupees: Number(lateFeeRupees || 0),
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to save fee structure.");
        return;
      }
      setName("");
      setCourseName("");
      setMessage("Fee structure saved. Historical receipts remain unchanged.");
      router.refresh();
    } catch {
      setError("Network error while saving fee structure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-border bg-surface inline-flex rounded-xl border p-1">
        <button
          type="button"
          onClick={() => setActiveTab("structures")}
          className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "structures"
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Fee Structures ({structures.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reminders")}
          className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "reminders"
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Fee Reminder Settings ({reminderRules.length})
        </button>
      </div>

      {activeTab === "reminders" ? (
        <FeeReminderSettingsClient
          initialRules={reminderRules}
          initialDashboard={reminderDashboard}
          courses={courses}
          batches={batches}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Create Fee Structure</CardTitle>
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
                <Input
                  label="Structure Title"
                  required
                  placeholder="e.g. ADCA 12-Month Installment Plan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Course Name"
                  required
                  placeholder="e.g. ADCA"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
                <Select
                  label="Frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as FeeFrequency)}
                  options={[
                    { label: "Installment", value: "installment" },
                    { label: "Monthly", value: "monthly" },
                    { label: "One-Time", value: "one_time" },
                    { label: "Admission", value: "admission" },
                  ]}
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Tuition (₹)"
                    type="number"
                    min={1}
                    required
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                  />
                  <Input
                    label="Admission (₹)"
                    type="number"
                    min={0}
                    value={admissionFeeRupees}
                    onChange={(e) => setAdmissionFeeRupees(e.target.value)}
                  />
                  <Input
                    label="Late Fee (₹)"
                    type="number"
                    min={0}
                    value={lateFeeRupees}
                    onChange={(e) => setLateFeeRupees(e.target.value)}
                  />
                </div>
                <Button type="submit" loading={loading} fullWidth>
                  Save Fee Structure
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Active Fee Structures ({structures.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-border divide-y text-xs">
                {structures.length === 0 ? (
                  <p className="text-muted py-6 text-center">
                    No fee structures configured yet.
                  </p>
                ) : (
                  structures.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div>
                        <p className="text-foreground text-sm font-semibold">{s.name}</p>
                        <p className="text-muted">
                          {s.courseName} · {s.frequency} · Effective {s.effectiveFrom}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-bold tabular-nums">
                          ₹{(s.amountPaise / 100).toFixed(2)}
                        </span>
                        <Badge variant="success">{s.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
