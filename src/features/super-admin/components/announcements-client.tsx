"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformAnnouncementRecord } from "@/services/su-platform.service";

export function AnnouncementsClient({
  initialAnnouncements,
}: {
  initialAnnouncements: PlatformAnnouncementRecord[];
}) {
  const [announcements, setAnnouncements] = React.useState(initialAnnouncements);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [status, setStatus] = React.useState<"published" | "draft" | "scheduled">(
    "published"
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/su/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          targetScope: "all",
          targetInstituteIds: [],
          status,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { announcement: PlatformAnnouncementRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to publish announcement.");
        return;
      }
      setAnnouncements((prev) => [json.data!.announcement, ...prev]);
      setTitle("");
      setBody("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Create Platform Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              role="alert"
              className="bg-danger-soft text-danger mb-4 flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3.5">
            <Input
              label="Title"
              placeholder="e.g. Scheduled Maintenance Window"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              label="Announcement Body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "published" | "draft" | "scheduled")
              }
              options={[
                { label: "Publish Immediately", value: "published" },
                { label: "Save as Draft", value: "draft" },
                { label: "Scheduled", value: "scheduled" },
              ]}
            />
            <Button type="submit" fullWidth loading={loading}>
              Save Announcement
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3 lg:col-span-7">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="text-muted py-10 text-center text-sm">
              No platform announcements published yet.
            </CardContent>
          </Card>
        ) : (
          announcements.map((ann) => (
            <Card key={ann.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{ann.title}</CardTitle>
                <Badge variant={ann.status === "published" ? "success" : "outline"}>
                  {ann.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted">{ann.body}</p>
                <p className="text-muted font-mono text-[11px]">
                  Target: {ann.targetScope} &bull; {ann.createdAt.slice(0, 10)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
