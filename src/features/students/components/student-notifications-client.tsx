"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface StudentNotificationItem {
  id: string;
  category: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export function StudentNotificationsClient({
  initialItems,
}: {
  initialItems: StudentNotificationItem[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const markRead = async (notificationId: string) => {
    setLoadingId(notificationId);
    try {
      const res = await fetch("/api/student/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted py-10 text-center text-sm">
          No notifications from your institute yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((n) => (
        <div
          key={n.id}
          className={`flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${
            n.read
              ? "border-border bg-background"
              : "border-primary/40 bg-primary-soft/30"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{n.category}</Badge>
              {!n.read && <Badge variant="primary">Unread</Badge>}
            </div>
            <p className="text-foreground text-sm">{n.message}</p>
            <p className="text-muted font-mono text-[11px]">
              {n.createdAt.slice(0, 19).replace("T", " ")}
            </p>
          </div>
          {!n.read && (
            <Button
              variant="outline"
              size="sm"
              loading={loadingId === n.id}
              leftIcon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => markRead(n.id)}
            >
              Mark as Read
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
