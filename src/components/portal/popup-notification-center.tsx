"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CheckCheck, Megaphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import type {
  PopupMessageCategory,
  RecipientPopupMessage,
} from "@/services/popup-messages.service";

interface Props {
  extraAlert?: {
    title: string;
    description: string;
    href: string;
  } | null;
  extraUnreadCount?: number;
  viewAllHref?: string;
}

const CATEGORY_LABEL: Record<PopupMessageCategory, string> = {
  announcement: "Announcement",
  fee_reminder: "Fee Reminder",
  exam_notice: "Exam Notice",
  billing_alert: "Billing Alert",
  urgent: "Urgent",
};

const CATEGORY_VARIANT: Record<
  PopupMessageCategory,
  "primary" | "warning" | "danger" | "navy"
> = {
  announcement: "primary",
  fee_reminder: "warning",
  exam_notice: "navy",
  billing_alert: "warning",
  urgent: "danger",
};

export function PopupNotificationCenter({
  extraAlert,
  extraUnreadCount = 0,
  viewAllHref,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<RecipientPopupMessage[]>([]);
  const [activePopup, setActivePopup] = React.useState<RecipientPopupMessage | null>(
    null
  );
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let active = true;
    fetch("/api/popup-messages")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { messages?: RecipientPopupMessage[] } } | null) => {
        if (!active || !json?.data?.messages) return;
        const list = json.data.messages;
        setMessages(list);
        const firstUnread = list.find((m) => !m.isRead) ?? null;
        if (firstUnread) {
          setActivePopup(firstUnread);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    function handleOutside(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  async function markIdsRead(ids: string[]) {
    if (ids.length === 0) return;
    setMessages((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, isRead: true } : m))
    );
    await fetch("/api/popup-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", messageIds: ids }),
    }).catch(() => undefined);
  }

  async function dismissPopup() {
    if (!activePopup) return;
    const id = activePopup.id;
    setActivePopup(null);
    await markIdsRead([id]);
  }

  const unreadMessages = messages.filter((m) => !m.isRead);
  const totalBadge = unreadMessages.length + extraUnreadCount + (extraAlert ? 1 : 0);

  return (
    <>
      <div ref={containerRef} className="relative">
        <IconButton
          variant="outline"
          size="sm"
          aria-label={`Notifications (${totalBadge} unread)`}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((p) => !p)}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </IconButton>

        {totalBadge > 0 && (
          <span className="bg-primary ring-background pointer-events-none absolute -top-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2">
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}

        {open && (
          <div className="border-border bg-background absolute right-0 z-50 mt-2 w-80 rounded-2xl border p-3.5 shadow-xl sm:w-96">
            <div className="border-border flex items-center justify-between border-b pb-2.5">
              <div>
                <p className="text-foreground text-xs font-semibold">
                  Notifications &amp; Alerts
                </p>
                <p className="text-muted text-[11px]">
                  {unreadMessages.length} unread message(s)
                </p>
              </div>
              {unreadMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => markIdsRead(unreadMessages.map((m) => m.id))}
                  className="text-primary inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="sidebar-scroll mt-2.5 max-h-80 space-y-2 overflow-y-auto pr-1 text-xs">
              {extraAlert && (
                <Link
                  href={extraAlert.href}
                  onClick={() => setOpen(false)}
                  className="bg-warning-soft text-warning block rounded-xl border border-amber-200/80 p-2.5"
                >
                  <p className="font-semibold">{extraAlert.title}</p>
                  <p className="mt-0.5 text-[11px] opacity-90">
                    {extraAlert.description}
                  </p>
                </Link>
              )}

              {messages.length === 0 && !extraAlert ? (
                <p className="text-muted py-6 text-center text-xs">
                  No notifications received yet.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-2.5 transition ${
                      m.isRead
                        ? "border-border bg-background"
                        : "border-primary/30 bg-primary-soft/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={CATEGORY_VARIANT[m.category]}>
                        {CATEGORY_LABEL[m.category]}
                      </Badge>
                      <span className="text-muted text-[10px]">
                        {new Date(m.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-foreground mt-1.5 font-semibold">{m.title}</p>
                    <p className="text-muted mt-0.5 text-[11px] leading-relaxed">
                      {m.message}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-muted">From: {m.senderName}</span>
                      {m.ctaHref && (
                        <Link
                          href={m.ctaHref}
                          onClick={() => {
                            setOpen(false);
                            if (!m.isRead) markIdsRead([m.id]);
                          }}
                          className="text-primary font-semibold hover:underline"
                        >
                          {m.ctaLabel || "Open"} &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {viewAllHref && (
              <div className="border-border mt-2.5 border-t pt-2 text-center">
                <Link
                  href={viewAllHref}
                  onClick={() => setOpen(false)}
                  className="text-primary text-xs font-semibold hover:underline"
                >
                  Open Full Notifications Page &rarr;
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* First-Time Popup Modal */}
      {activePopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-time-popup-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="border-border bg-background w-full max-w-md rounded-2xl border p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary-soft text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Megaphone className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <Badge variant={CATEGORY_VARIANT[activePopup.category]}>
                    {CATEGORY_LABEL[activePopup.category]}
                  </Badge>
                  <p className="text-muted mt-1 text-[11px]">
                    From {activePopup.senderName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss popup"
                onClick={dismissPopup}
                className="text-muted hover:text-foreground cursor-pointer rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2
              id="first-time-popup-title"
              className="text-foreground mt-4 text-lg font-bold tracking-tight"
            >
              {activePopup.title}
            </h2>
            <p className="text-muted mt-2 text-sm leading-relaxed whitespace-pre-line">
              {activePopup.message}
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {activePopup.ctaHref && (
                <Link
                  href={activePopup.ctaHref}
                  onClick={dismissPopup}
                  className="bg-primary hover:bg-primary-dark inline-flex h-9 items-center rounded-lg px-4 text-xs font-semibold text-white"
                >
                  {activePopup.ctaLabel || "View Details"}
                </Link>
              )}
              <Button type="button" variant="outline" size="sm" onClick={dismissPopup}>
                Acknowledge &amp; Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
