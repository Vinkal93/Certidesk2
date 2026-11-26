"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  EmergencyActionRecord,
  EmergencyControlFlags,
} from "@/services/emergency.service";

interface Props {
  initialFlags: EmergencyControlFlags;
  initialReason: string;
  initialExpiresAt?: string;
  initialExpired: boolean;
  initialActions: EmergencyActionRecord[];
}

export function EmergencyOpsClient({
  initialFlags,
  initialReason,
  initialExpiresAt,
  initialExpired,
  initialActions,
}: Props) {
  const router = useRouter();
  const [flags, setFlags] = useState<EmergencyControlFlags>(initialFlags);
  const [reason, setReason] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState("60");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const mins = Number(expiresInMinutes);
      const res = await fetch("/api/su/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_controls",
          flags,
          reason,
          ...(Number.isFinite(mins) && mins > 0 ? { expiresInMinutes: mins } : {}),
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to update emergency controls.");
      }
      setNotice("Emergency control state updated and audited.");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update emergency controls.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRollback(actionId: string) {
    const rbReason = window.prompt(`Reason for rolling back action ${actionId}:`);
    if (!rbReason?.trim()) return;
    setError(null);
    const res = await fetch("/api/su/emergency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rollback",
        actionId,
        reason: rbReason.trim(),
      }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: { message?: string } };
      setError(json.error?.message ?? "Failed to rollback emergency action.");
      return;
    }
    setNotice(`Rolled back ${actionId}.`);
    router.refresh();
  }

  const controlItems: { key: keyof EmergencyControlFlags; label: string; desc: string }[] = [
    {
      key: "maintenanceMode",
      label: "Maintenance Mode",
      desc: "Displays platform maintenance notice across non-Super Admin portals.",
    },
    {
      key: "readOnlyMode",
      label: "Read-Only Lockdown",
      desc: "Blocks all write mutations while preserving read access.",
    },
    {
      key: "registrationPaused",
      label: "Pause Institute Registration",
      desc: "Halts new institute onboarding and public sign-ups.",
    },
    {
      key: "paymentsPaused",
      label: "Pause Payment Checkout",
      desc: "Suspends new Razorpay order creation across portals.",
    },
    {
      key: "certificatesPaused",
      label: "Pause Certificate Issuance",
      desc: "Halts new certificate generation during template or security incidents.",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Platform Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-xs">
            <span className="font-medium">Current Status: </span>
            <span>{initialReason}</span>
            {initialExpiresAt && (
              <span className="ml-2 text-muted-foreground">
                ({initialExpired ? "Expired" : "Expires"}: {new Date(initialExpiresAt).toLocaleString()})
              </span>
            )}
          </div>

          <form onSubmit={handleApply} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {controlItems.map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={flags[item.key]}
                    onChange={(e) =>
                      setFlags((prev) => ({ ...prev, [item.key]: e.target.checked }))
                    }
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      {flags[item.key] && <Badge variant="danger">ACTIVE</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Mandatory Operational Reason
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe incident or maintenance window"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Auto-Expire After (Minutes, 0 = manual)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={10080}
                  value={expiresInMinutes}
                  onChange={(e) => setExpiresInMinutes(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && <p className="text-sm text-emerald-600">{notice}</p>}

            <Button type="submit" variant="destructive" disabled={submitting}>
              <AlertTriangle className="mr-1.5 h-4 w-4" />
              {submitting ? "Applying..." : "Apply Emergency Controls"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Action History & Rollback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emergency actions recorded.</p>
          ) : (
            initialActions.map((act) => (
              <div
                key={act.id}
                className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">{act.id}</span>
                    <Badge variant="outline">{act.actionType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{act.reason}</p>
                </div>
                {act.actionType === "update_controls" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRollback(act.id)}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Rollback to Prior State
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
