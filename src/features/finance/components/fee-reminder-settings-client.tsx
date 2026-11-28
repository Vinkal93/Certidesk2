"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Play,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BatchRecord, CourseRecord } from "@/types/academic";
import type {
  FeeReminderDashboardSummary,
  FeeReminderFeeStatus,
  FeeReminderPriority,
  FeeReminderRuleRecord,
  FeeReminderTargetAudience,
  FeeReminderTargetLogic,
  FeeReminderTriggerType,
  FeeReminderType,
} from "@/types/fee-reminder";

const PLACEHOLDERS = [
  "{student_name}",
  "{institute_name}",
  "{course_name}",
  "{pending_amount}",
  "{due_date}",
  "{paid_amount}",
  "{month}",
];

const TRIGGER_LABELS: Record<FeeReminderTriggerType, string> = {
  before_due_date: "Before Due Date",
  on_due_date: "On Due Date",
  after_due_date: "After Due Date",
  specific_calendar_date: "Specific Calendar Date",
  specific_day_of_month: "Specific Day of Every Month",
  between_dates: "Between Two Days of Month",
  monthly_recurring: "Monthly Recurring Reminder",
};

export function FeeReminderSettingsClient({
  initialRules,
  initialDashboard,
  courses,
  batches,
}: {
  initialRules: FeeReminderRuleRecord[];
  initialDashboard: FeeReminderDashboardSummary;
  courses: CourseRecord[];
  batches: BatchRecord[];
}) {
  const router = useRouter();
  const [rules, setRules] = React.useState(initialRules);
  const [dashboard, setDashboard] = React.useState(initialDashboard);

  // Rule builder form state
  const [name, setName] = React.useState("");
  const [triggerType, setTriggerType] =
    React.useState<FeeReminderTriggerType>("before_due_date");
  const [offsetDays, setOffsetDays] = React.useState("5");
  const [dayOfMonth, setDayOfMonth] = React.useState("5");
  const [specificDate, setSpecificDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [rangeStartDay, setRangeStartDay] = React.useState("5");
  const [rangeEndDay, setRangeEndDay] = React.useState("10");

  const [targetAudience, setTargetAudience] =
    React.useState<FeeReminderTargetAudience>("all_students");
  const [selectedCourseIds, setSelectedCourseIds] = React.useState<string[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = React.useState<string[]>([]);
  const [feeStatuses, setFeeStatuses] = React.useState<FeeReminderFeeStatus[]>([
    "pending",
  ]);
  const [targetLogic, setTargetLogic] = React.useState<FeeReminderTargetLogic>("AND");

  const [reminderType, setReminderType] = React.useState<FeeReminderType>("due");
  const [priority, setPriority] = React.useState<FeeReminderPriority>("normal");
  const [titleTemplate, setTitleTemplate] = React.useState(
    "Fee Reminder — {month} ({course_name})"
  );
  const [messageTemplate, setMessageTemplate] = React.useState(
    "Dear {student_name}, your monthly fee of ₹{pending_amount} is pending. Please clear your dues by {due_date}."
  );
  const [allowDismiss, setAllowDismiss] = React.useState(true);
  const [allowRemindLater, setAllowRemindLater] = React.useState(true);
  const [remindLaterHours, setRemindLaterHours] = React.useState("24");
  const [active, setActive] = React.useState(true);

  const [saving, setSaving] = React.useState(false);
  const [evaluating, setEvaluating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const toggleFeeStatus = (st: FeeReminderFeeStatus) => {
    setFeeStatuses((prev) =>
      prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]
    );
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/finance/fee-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          triggerType,
          offsetDays: Number(offsetDays || 0),
          dayOfMonth: Number(dayOfMonth || 5),
          specificDate,
          rangeStartDay: Number(rangeStartDay || 5),
          rangeEndDay: Number(rangeEndDay || 10),
          targetAudience,
          courseIds: targetAudience === "specific_courses" ? selectedCourseIds : [],
          batchIds: targetAudience === "specific_batches" ? selectedBatchIds : [],
          feeStatusFilters: feeStatuses.length > 0 ? feeStatuses : ["pending"],
          targetLogic,
          titleTemplate,
          messageTemplate,
          reminderType,
          priority,
          allowDismiss,
          allowRemindLater,
          remindLaterHours: Number(remindLaterHours || 24),
          active,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          rules?: FeeReminderRuleRecord[];
          dashboard?: FeeReminderDashboardSummary;
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create reminder rule.");
        return;
      }
      if (json.data.rules) setRules(json.data.rules);
      if (json.data.dashboard) setDashboard(json.data.dashboard);
      setName("");
      setMessage("Fee reminder rule created and evaluated for eligible students.");
      router.refresh();
    } catch {
      setError("Network error while saving reminder rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleEvaluateNow = async () => {
    setEvaluating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/finance/fee-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate_now" }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          generatedCount?: number;
          resolvedPaidCount?: number;
          rules?: FeeReminderRuleRecord[];
          dashboard?: FeeReminderDashboardSummary;
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Evaluation failed.");
        return;
      }
      if (json.data.rules) setRules(json.data.rules);
      if (json.data.dashboard) setDashboard(json.data.dashboard);
      setMessage(
        `Evaluated rules: ${json.data.generatedCount ?? 0} new reminder(s) generated, ${
          json.data.resolvedPaidCount ?? 0
        } resolved after payment.`
      );
      router.refresh();
    } finally {
      setEvaluating(false);
    }
  };

  const handleToggleRule = async (rule: FeeReminderRuleRecord) => {
    const res = await fetch(`/api/institute/finance/fee-reminders/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    if (res.ok) {
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, active: !rule.active } : r))
      );
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const res = await fetch(`/api/institute/finance/fee-reminders/${ruleId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setMessage("Fee reminder rule deleted.");
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-foreground flex items-center gap-2 text-lg font-bold">
            <BellRing className="text-primary h-5 w-5" aria-hidden="true" />
            Automated Fee Reminder Rule Engine
          </h3>
          <p className="text-muted text-xs">
            Configure trigger rules, dynamic student placeholders, and track delivery
            &amp; read performance.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          loading={evaluating}
          leftIcon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() => void handleEvaluateNow()}
        >
          Evaluate Rules Now
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Total Generated</p>
            <p className="text-foreground mt-1 text-xl font-bold tabular-nums">
              {dashboard.totalGenerated}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Active Delivered</p>
            <p className="text-primary mt-1 text-xl font-bold tabular-nums">
              {dashboard.deliveredCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Read / Dismissed</p>
            <p className="text-success mt-1 text-xl font-bold tabular-nums">
              {dashboard.readCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Unread</p>
            <p className="text-warning mt-1 text-xl font-bold tabular-nums">
              {dashboard.unreadCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px]">Overdue Students</p>
            <p className="text-danger mt-1 text-xl font-bold tabular-nums">
              {dashboard.overdueStudentsCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Rule Builder Form */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Create Fee Reminder Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs">
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

            <form onSubmit={handleCreateRule} className="space-y-3">
              <Input
                label="Rule Name *"
                required
                placeholder="e.g. Monthly 5-Day Pre-Due Reminder"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  label="Trigger Condition *"
                  value={triggerType}
                  onChange={(e) =>
                    setTriggerType(e.target.value as FeeReminderTriggerType)
                  }
                  options={Object.entries(TRIGGER_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />

                {triggerType === "before_due_date" || triggerType === "after_due_date" ? (
                  <Input
                    label="Offset Days"
                    type="number"
                    min={0}
                    max={60}
                    value={offsetDays}
                    onChange={(e) => setOffsetDays(e.target.value)}
                  />
                ) : null}

                {triggerType === "specific_day_of_month" ||
                triggerType === "monthly_recurring" ? (
                  <Input
                    label="Day of Month (1-31)"
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                  />
                ) : null}

                {triggerType === "specific_calendar_date" ? (
                  <Input
                    label="Specific Date"
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                  />
                ) : null}
              </div>

              {triggerType === "between_dates" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="From Day (1-31)"
                    type="number"
                    min={1}
                    max={31}
                    value={rangeStartDay}
                    onChange={(e) => setRangeStartDay(e.target.value)}
                  />
                  <Input
                    label="To Day (1-31)"
                    type="number"
                    min={1}
                    max={31}
                    value={rangeEndDay}
                    onChange={(e) => setRangeEndDay(e.target.value)}
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  label="Target Audience"
                  value={targetAudience}
                  onChange={(e) =>
                    setTargetAudience(e.target.value as FeeReminderTargetAudience)
                  }
                  options={[
                    { label: "All Students", value: "all_students" },
                    { label: "Specific Courses", value: "specific_courses" },
                    { label: "Specific Batches", value: "specific_batches" },
                  ]}
                />
                <Select
                  label="Target Match Logic"
                  value={targetLogic}
                  onChange={(e) =>
                    setTargetLogic(e.target.value as FeeReminderTargetLogic)
                  }
                  options={[
                    { label: "Match ALL (AND)", value: "AND" },
                    { label: "Match ANY (OR)", value: "OR" },
                  ]}
                />
              </div>

              {targetAudience === "specific_courses" ? (
                <div className="border-border bg-surface/50 max-h-28 space-y-1 overflow-y-auto rounded-lg border p-2 text-xs">
                  {courses.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.includes(c.id)}
                        onChange={(e) =>
                          setSelectedCourseIds((prev) =>
                            e.target.checked
                              ? [...prev, c.id]
                              : prev.filter((id) => id !== c.id)
                          )
                        }
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {targetAudience === "specific_batches" ? (
                <div className="border-border bg-surface/50 max-h-28 space-y-1 overflow-y-auto rounded-lg border p-2 text-xs">
                  {batches.map((b) => (
                    <label key={b.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBatchIds.includes(b.id)}
                        onChange={(e) =>
                          setSelectedBatchIds((prev) =>
                            e.target.checked
                              ? [...prev, b.id]
                              : prev.filter((id) => id !== b.id)
                          )
                        }
                      />
                      <span>{b.name}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              <div className="space-y-1">
                <p className="text-foreground text-xs font-medium">Fee Status Filter</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(
                    ["pending", "overdue", "upcoming", "any"] as FeeReminderFeeStatus[]
                  ).map((st) => (
                    <label
                      key={st}
                      className="border-border bg-surface flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 capitalize"
                    >
                      <input
                        type="checkbox"
                        checked={feeStatuses.includes(st)}
                        onChange={() => toggleFeeStatus(st)}
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Reminder Type"
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value as FeeReminderType)}
                  options={[
                    { label: "Upcoming", value: "upcoming" },
                    { label: "Due", value: "due" },
                    { label: "Overdue", value: "overdue" },
                  ]}
                />
                <Select
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as FeeReminderPriority)}
                  options={[
                    { label: "Low", value: "low" },
                    { label: "Normal", value: "normal" },
                    { label: "High", value: "high" },
                    { label: "Urgent", value: "urgent" },
                  ]}
                />
              </div>

              <Input
                label="Reminder Title Template *"
                required
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
              />

              <div className="space-y-1.5">
                <Textarea
                  label="Reminder Message Template *"
                  required
                  rows={3}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                />
                <div className="flex flex-wrap gap-1">
                  {PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setMessageTemplate((prev) => `${prev} ${ph}`)}
                      className="border-border bg-surface hover:bg-primary-soft text-foreground cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-border bg-surface/50 flex flex-wrap items-center gap-4 rounded-xl border p-2.5 text-xs">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={allowDismiss}
                    onChange={(e) => setAllowDismiss(e.target.checked)}
                  />
                  Allow Dismiss
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={allowRemindLater}
                    onChange={(e) => setAllowRemindLater(e.target.checked)}
                  />
                  Allow Remind Later
                </label>
                {allowRemindLater ? (
                  <div className="flex items-center gap-1">
                    <span className="text-muted">Snooze (hrs):</span>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={remindLaterHours}
                      onChange={(e) => setRemindLaterHours(e.target.value)}
                      className="border-border bg-background w-14 rounded border px-1.5 py-0.5 text-xs"
                    />
                  </div>
                ) : null}
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  Active
                </label>
              </div>

              <Button
                type="submit"
                loading={saving}
                fullWidth
                leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                Save Reminder Rule
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Rules & Performance */}
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Configured Reminder Rules ({rules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-border divide-y text-xs">
                {rules.length === 0 ? (
                  <p className="text-muted py-6 text-center">
                    No fee reminder rules configured yet.
                  </p>
                ) : (
                  rules.map((r) => {
                    const perf = dashboard.rulePerformance.find((p) => p.ruleId === r.id);
                    return (
                      <div key={r.id} className="space-y-2 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-foreground text-sm font-semibold">
                              {r.name}
                            </p>
                            <p className="text-muted">
                              {TRIGGER_LABELS[r.triggerType]} ·{" "}
                              {r.targetAudience.replace(/_/g, " ")} ·{" "}
                              {r.feeStatusFilters.join(", ")} ({r.targetLogic})
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                r.reminderType === "overdue"
                                  ? "danger"
                                  : r.reminderType === "due"
                                    ? "warning"
                                    : "primary"
                              }
                            >
                              {r.reminderType}
                            </Badge>
                            <Badge variant={r.active ? "success" : "outline"}>
                              {r.active ? "Active" : "Paused"}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-muted bg-surface rounded-lg p-2 text-[11px]">
                          {r.messageTemplate}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <span className="text-muted text-[11px]">
                            Generated: <b>{perf?.generatedCount ?? 0}</b> · Read:{" "}
                            <b>{perf?.readCount ?? 0}</b> · Paid &amp; Stopped:{" "}
                            <b>{perf?.resolvedPaidCount ?? 0}</b>
                          </span>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={
                                <Power className="h-3.5 w-3.5" aria-hidden="true" />
                              }
                              onClick={() => void handleToggleRule(r)}
                            >
                              {r.active ? "Pause" : "Activate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger hover:text-danger"
                              leftIcon={
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              }
                              onClick={() => void handleDeleteRule(r.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Reminder History per Student ({dashboard.recentDeliveries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-border bg-surface text-muted border-b">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Student</th>
                      <th className="px-3 py-2 font-semibold">Rule</th>
                      <th className="px-3 py-2 font-semibold">Pending</th>
                      <th className="px-3 py-2 font-semibold">Due Date</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {dashboard.recentDeliveries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-muted px-3 py-6 text-center">
                          No reminders generated yet.
                        </td>
                      </tr>
                    ) : (
                      dashboard.recentDeliveries.map((d) => (
                        <tr key={d.id}>
                          <td className="px-3 py-2">
                            <p className="font-semibold">{d.studentName}</p>
                            <p className="text-muted font-mono text-[10px]">
                              {d.studentCode}
                            </p>
                          </td>
                          <td className="px-3 py-2">{d.ruleName}</td>
                          <td className="px-3 py-2 font-semibold tabular-nums">
                            ₹{(d.pendingAmountPaise / 100).toFixed(0)}
                          </td>
                          <td className="px-3 py-2">{d.dueDate}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                d.status === "resolved_paid"
                                  ? "success"
                                  : d.status === "delivered"
                                    ? "warning"
                                    : "outline"
                              }
                            >
                              {d.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
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
    </div>
  );
}
