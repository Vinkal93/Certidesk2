"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommunicationLogRecord } from "@/services/institute-ops.service";

export function CommunicationClient({
  initialLogs,
  studentCount,
}: {
  initialLogs: CommunicationLogRecord[];
  studentCount: number;
}) {
  const [logs, setLogs] = React.useState(initialLogs);
  const [channel, setChannel] = React.useState<"in_app" | "whatsapp" | "sms">("in_app");
  const [category, setCategory] = React.useState<
    "fee_reminder" | "admission" | "examination" | "certificate" | "general"
  >("general");
  const [recipientCount, setRecipientCount] = React.useState(
    String(Math.max(1, studentCount))
  );
  const [messageText, setMessageText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/institute/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          category,
          recipientCount: Number(recipientCount),
          message: messageText,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { log: CommunicationLogRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to send notification.");
        return;
      }
      setLogs((prev) => [json.data!.log, ...prev]);
      setMessageText("");
      setSuccess("Notification dispatched and logged.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Send Institute Notification</CardTitle>
          <p className="text-muted text-xs">
            WhatsApp and SMS require configured external providers; In-App notifications
            deliver immediately.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-3.5">
            <Select
              label="Channel"
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as "in_app" | "whatsapp" | "sms")
              }
              options={[
                { label: "In-App Student Portal Notification", value: "in_app" },
                { label: "WhatsApp (Requires Provider Setup)", value: "whatsapp" },
                { label: "SMS (Requires Provider Setup)", value: "sms" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as
                      | "fee_reminder"
                      | "admission"
                      | "examination"
                      | "certificate"
                      | "general"
                  )
                }
                options={[
                  { label: "General Announcement", value: "general" },
                  { label: "Fee Reminder", value: "fee_reminder" },
                  { label: "Examination Notice", value: "examination" },
                  { label: "Certificate Ready", value: "certificate" },
                  { label: "Admission Welcome", value: "admission" },
                ]}
              />
              <Input
                label="Recipients"
                type="number"
                min="1"
                value={recipientCount}
                onChange={(e) => setRecipientCount(e.target.value)}
                required
              />
            </div>
            <Textarea
              label="Message"
              placeholder="Write your announcement or reminder..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              required
            />
            <Button
              type="submit"
              fullWidth
              loading={loading}
              rightIcon={<Send className="h-4 w-4" aria-hidden="true" />}
            >
              Send Notification
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle>Communication History</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted text-sm">No notifications dispatched yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border-border rounded-xl border p-3.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{log.channel}</Badge>
                      <Badge variant="outline">{log.category}</Badge>
                    </div>
                    <Badge variant="success">{log.providerStatus}</Badge>
                  </div>
                  <p className="text-foreground mt-2">{log.message}</p>
                  <p className="text-muted mt-1 font-mono text-[11px]">
                    {log.createdAt.slice(0, 19).replace("T", " ")} &bull;{" "}
                    {log.recipientCount} recipient(s)
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
