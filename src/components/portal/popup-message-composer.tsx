"use client";

import * as React from "react";
import { Megaphone, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  PopupMessageCategory,
  PopupMessageRecord,
} from "@/services/popup-messages.service";

interface TargetOption {
  id: string;
  label: string;
}

interface Props {
  mode: "super_admin" | "institute_admin";
  targets: TargetOption[];
  initialSent: PopupMessageRecord[];
}

export function PopupMessageComposer({ mode, targets, initialSent }: Props) {
  const [sent, setSent] = React.useState<PopupMessageRecord[]>(initialSent);
  const [targetType, setTargetType] = React.useState<
    "institute" | "all_institutes" | "student" | "all_students"
  >(mode === "super_admin" ? "all_institutes" : "all_students");
  const [targetId, setTargetId] = React.useState(targets[0]?.id ?? "");
  const [category, setCategory] = React.useState<PopupMessageCategory>(
    mode === "super_admin" ? "billing_alert" : "fee_reminder"
  );
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [ctaLabel, setCtaLabel] = React.useState("");
  const [ctaHref, setCtaHref] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setNotice(null);

    try {
      const payload =
        mode === "super_admin"
          ? {
              action: "send",
              targetType,
              instituteId: targetType === "institute" ? targetId : undefined,
              category,
              title,
              message,
              ctaLabel: ctaLabel || undefined,
              ctaHref: ctaHref || undefined,
            }
          : {
              action: "send",
              targetType,
              studentId: targetType === "student" ? targetId : undefined,
              category,
              title,
              message,
              ctaLabel: ctaLabel || undefined,
              ctaHref: ctaHref || undefined,
            };

      const res = await fetch("/api/popup-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        data?: { message?: PopupMessageRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.message) {
        setError(json.error?.message ?? "Failed to send popup message.");
        setSending(false);
        return;
      }

      setSent((prev) => [json.data!.message!, ...prev]);
      setTitle("");
      setMessage("");
      setCtaLabel("");
      setCtaHref("");
      setNotice(
        "Popup message dispatched! Recipients will see it immediately on next portal open and inside their notification bell."
      );
    } catch {
      setError("Network error while sending popup message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="text-primary h-4 w-4" aria-hidden="true" />
            {mode === "super_admin"
              ? "Send Popup Message to Institutes"
              : "Send Popup / Fee Reminder to Students"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <p className="bg-danger-soft text-danger rounded-lg p-2.5 text-xs">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                {notice}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-muted mb-1 block text-xs font-medium">
                  Audience
                </label>
                <select
                  value={targetType}
                  onChange={(e) =>
                    setTargetType(
                      e.target.value as
                        "institute" | "all_institutes" | "student" | "all_students"
                    )
                  }
                  className="border-border bg-background text-foreground h-9 w-full rounded-lg border px-3 text-sm"
                >
                  {mode === "super_admin" ? (
                    <>
                      <option value="all_institutes">All Institutes (Broadcast)</option>
                      <option value="institute">Specific Institute</option>
                    </>
                  ) : (
                    <>
                      <option value="all_students">All Students (Broadcast)</option>
                      <option value="student">Specific Student</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-muted mb-1 block text-xs font-medium">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PopupMessageCategory)}
                  className="border-border bg-background text-foreground h-9 w-full rounded-lg border px-3 text-sm"
                >
                  {mode === "institute_admin" && (
                    <option value="fee_reminder">Fee Reminder</option>
                  )}
                  <option value="announcement">Announcement</option>
                  <option value="exam_notice">Exam Notice</option>
                  {mode === "super_admin" && (
                    <option value="billing_alert">Billing / Subscription Alert</option>
                  )}
                  <option value="urgent">Urgent Alert</option>
                </select>
              </div>
            </div>

            {((mode === "super_admin" && targetType === "institute") ||
              (mode === "institute_admin" && targetType === "student")) && (
              <div>
                <label className="text-muted mb-1 block text-xs font-medium">
                  {mode === "super_admin" ? "Select Institute" : "Select Student"}
                </label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="border-border bg-background text-foreground h-9 w-full rounded-lg border px-3 text-sm"
                >
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-muted mb-1 block text-xs font-medium">
                Popup Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  mode === "super_admin"
                    ? "e.g. Monthly Platform Subscription Due"
                    : "e.g. Tuition Fee Reminder — November"
                }
                required
              />
            </div>

            <div>
              <label className="text-muted mb-1 block text-xs font-medium">
                Message Body *
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write clear instructions or reminder details..."
                required
                className="border-border bg-background text-foreground w-full rounded-lg border p-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-muted mb-1 block text-xs font-medium">
                  Action Button Label (Optional)
                </label>
                <Input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder={mode === "super_admin" ? "View Wallet" : "View Fees"}
                />
              </div>
              <div>
                <label className="text-muted mb-1 block text-xs font-medium">
                  Action Link (Optional)
                </label>
                <Input
                  value={ctaHref}
                  onChange={(e) => setCtaHref(e.target.value)}
                  placeholder={
                    mode === "super_admin" ? "/institute/wallet" : "/student/fees"
                  }
                />
              </div>
            </div>

            <Button type="submit" disabled={sending}>
              <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {sending ? "Sending..." : "Send Popup Notification"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Dispatched Popup Messages ({sent.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="sidebar-scroll max-h-[420px] space-y-2.5 overflow-y-auto">
          {sent.length === 0 ? (
            <p className="text-muted text-sm">No popup messages sent yet.</p>
          ) : (
            sent.map((m) => (
              <div key={m.id} className="border-border rounded-xl border p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-foreground font-semibold">{m.title}</span>
                  <Badge variant="primary">{m.category}</Badge>
                </div>
                <p className="text-muted mt-1">{m.message}</p>
                <div className="text-muted mt-2 flex items-center justify-between text-[11px]">
                  <span>To: {m.targetLabel}</span>
                  <span>Read by {m.readByUids.length} user(s)</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
