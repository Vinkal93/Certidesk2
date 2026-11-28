"use client";

import * as React from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SendDuesReminderButton({ dueCount }: { dueCount: number }) {
  const [sending, setSending] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSendAll = async () => {
    setSending(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/institute/finance/dues-reminder", {
        method: "POST",
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { sentCount: number; skippedCount: number };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to send popup reminders.");
        return;
      }
      setFeedback(`Popup fee reminder sent to ${json.data.sentCount} student(s).`);
    } catch {
      setError("Network error while sending popup reminders.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {feedback ? (
        <span className="text-success inline-flex items-center gap-1 text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {feedback}
        </span>
      ) : null}
      {error ? <span className="text-danger text-xs font-medium">{error}</span> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={sending}
        disabled={dueCount === 0}
        leftIcon={<BellRing className="h-3.5 w-3.5" aria-hidden="true" />}
        onClick={() => void handleSendAll()}
      >
        Send Popup Reminder
      </Button>
    </div>
  );
}
