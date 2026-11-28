"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Laptop,
  LogOut,
  RefreshCw,
  Shield,
  Smartphone,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActiveDeviceSession {
  id: string;
  device: string;
  os?: string;
  browser: string;
  isMobile: boolean;
  ipAddress: string;
  createdAt: string;
  lastVerifiedAt: string;
  expiresAt: string;
  status?: "active" | "revoked" | "expired";
  revokedAt?: string | null;
  revokeReason?: string | null;
  isCurrent: boolean;
}

export function ManageDevicesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"active" | "history">("active");
  const [sessions, setSessions] = React.useState<ActiveDeviceSession[]>([]);
  const [history, setHistory] = React.useState<ActiveDeviceSession[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const refreshSessions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sessions", { cache: "no-store" });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          sessions: ActiveDeviceSession[];
          history?: ActiveDeviceSession[];
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Unable to load active devices.");
        return;
      }
      setSessions(json.data.sessions);
      if (json.data.history) setHistory(json.data.history);
    } catch {
      setError("Network error while loading active devices.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization: initial fetch + 4-second live polling while open
  React.useEffect(() => {
    if (!open) return;
    let active = true;

    const sync = () => {
      fetch("/api/auth/sessions", { cache: "no-store" })
        .then((res) => res.json())
        .then(
          (json: {
            ok: boolean;
            data?: {
              sessions: ActiveDeviceSession[];
              history?: ActiveDeviceSession[];
            };
            error?: { message?: string };
          }) => {
            if (!active) return;
            if (!json.ok || !json.data) {
              setError(json.error?.message ?? "Unable to load active devices.");
              return;
            }
            setError(null);
            setSessions(json.data.sessions);
            if (json.data.history) setHistory(json.data.history);
          }
        )
        .catch(() => {
          if (active) setError("Network error while loading active devices.");
        });
    };

    sync();
    const timer = setInterval(sync, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [open]);

  if (!open) return null;

  async function handleRevoke(sessionId: string) {
    setBusyId(sessionId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { revoked: boolean; revokedCurrent: boolean };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to sign out device.");
        return;
      }
      if (json.data?.revokedCurrent) {
        onClose();
        router.replace("/login");
        router.refresh();
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setMessage("Device signed out and server session invalidated.");
      void refreshSessions();
    } catch {
      setError("Network error while signing out device.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevokeOthers() {
    setBusyId("ALL_OTHERS");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/sessions", { method: "DELETE" });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { revokedCount: number };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to sign out other devices.");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setMessage(
        `Signed out ${json.data?.revokedCount ?? 0} other device(s). This device stays logged in.`
      );
      void refreshSessions();
    } catch {
      setError("Network error while signing out other devices.");
    } finally {
      setBusyId(null);
    }
  }

  const otherCount = sessions.filter((s) => !s.isCurrent).length;
  const displayed = tab === "active" ? sessions : history;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Manage Logged-in Devices"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="border-border bg-background max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border flex items-center justify-between border-b pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary-soft text-primary flex h-9 w-9 items-center justify-center rounded-xl">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-semibold">
                Manage Active Devices
              </h2>
              <p className="text-muted text-xs">
                Live-synced across browsers &amp; devices (auto-updates every 4s).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void refreshSessions()}
              aria-label="Refresh devices"
              className="text-muted hover:bg-surface hover:text-foreground rounded-lg p-1.5 transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-muted hover:bg-surface hover:text-foreground rounded-lg p-1.5 transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-border mt-3 flex gap-2 border-b pb-2.5 text-xs">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition-colors ${
              tab === "active"
                ? "bg-primary text-white"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            Active Devices ({sessions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
              tab === "history"
                ? "bg-primary text-white"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Login History ({history.length})
          </button>
        </div>

        {error && (
          <div className="bg-danger-soft text-danger mt-3 flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-800/60">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-success-soft text-success mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs dark:border-emerald-800/60">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          {loading && displayed.length === 0 ? (
            <p className="text-muted py-6 text-center text-xs">
              Loading device sessions...
            </p>
          ) : displayed.length === 0 ? (
            <p className="text-muted py-6 text-center text-xs">
              No device sessions found.
            </p>
          ) : (
            displayed.map((s) => (
              <div
                key={s.id}
                className="border-border bg-surface flex items-center justify-between gap-3 rounded-xl border p-3.5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="bg-background border-border text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                    {s.isMobile ? (
                      <Smartphone className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Laptop className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {s.device} · {s.browser}
                      </p>
                      {s.isCurrent && <Badge variant="success">Current Device</Badge>}
                      {s.os && <Badge variant="outline">{s.os}</Badge>}
                      {tab === "history" && s.status && s.status !== "active" && (
                        <Badge variant="danger">{s.status}</Badge>
                      )}
                    </div>
                    <p className="text-muted mt-0.5 text-[11px]">
                      IP: {s.ipAddress} · Last active:{" "}
                      {s.lastVerifiedAt.slice(0, 16).replace("T", " ")}
                    </p>
                    {tab === "history" && s.revokeReason && (
                      <p className="text-muted mt-0.5 text-[11px]">
                        Note: {s.revokeReason}
                      </p>
                    )}
                  </div>
                </div>
                {s.status !== "revoked" && s.status !== "expired" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={busyId === s.id}
                    onClick={() => void handleRevoke(s.id)}
                    leftIcon={<LogOut className="h-3.5 w-3.5" aria-hidden="true" />}
                  >
                    {s.isCurrent ? "Sign Out" : "Revoke"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3.5">
          {otherCount > 0 ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              loading={busyId === "ALL_OTHERS"}
              onClick={() => void handleRevokeOthers()}
            >
              Sign Out All Other Devices ({otherCount})
            </Button>
          ) : (
            <span className="text-muted text-xs">Only this device is active.</span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
