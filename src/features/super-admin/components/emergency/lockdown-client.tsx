"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldAlert, Unlock } from "lucide-react";
import { useActionFeedback } from "@/components/ui/action-feedback-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  LockdownType,
  PlatformLockdownRecord,
  ServiceRegistryDefinition,
} from "@/types/emergency";
import { EmergencyHeaderBar, formatEmergencyDate } from "./emergency-shared";

interface Props {
  initialLockdowns: PlatformLockdownRecord[];
  institutes: Array<{ id: string; name: string; code: string; status: string }>;
  services: ServiceRegistryDefinition[];
}

const LOCKDOWN_DESCRIPTIONS: Record<LockdownType, string> = {
  global:
    "Blocks all Institute and Student portal access and API requests across the entire platform. Super Admin recovery access remains exempt.",
  institute:
    "Restricts only the selected institute workspace without affecting any other tenant.",
  authentication:
    "Halts non-Super-Admin authentication and login workflows while preserving existing verified Super Admin sessions.",
  api_write:
    "Places all non-Super-Admin APIs into strict read-only mode (blocks POST/PATCH/DELETE mutations).",
  admin_actions:
    "Freezes Institute Admin and Staff write operations while keeping read-only dashboards and Student portals accessible.",
};

export function LockdownClient({ initialLockdowns, institutes, services }: Props) {
  const router = useRouter();
  const { confirm, runWithBanner } = useActionFeedback();
  const [lockdowns, setLockdowns] = useState<PlatformLockdownRecord[]>(initialLockdowns);
  const [type, setType] = useState<LockdownType>("institute");
  const [instituteId, setInstituteId] = useState<string>(institutes[0]?.id ?? "");
  const [restrictedServices, setRestrictedServices] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/su/emergency/lockdown", { cache: "no-store" });
    const json = (await res.json()) as {
      data?: { lockdowns: PlatformLockdownRecord[] };
    };
    if (res.ok && json.data) {
      setLockdowns(json.data.lockdowns);
    }
    router.refresh();
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (type === "global" && confirmPhrase !== "LOCKDOWN") {
      setError('Type "LOCKDOWN" in the confirmation box to activate Global Lockdown.');
      return;
    }

    const resConfirm = await confirm({
      title: `Activate ${type.toUpperCase()} Lockdown?`,
      description: `${LOCKDOWN_DESCRIPTIONS[type]} Reason: ${reason}`,
      confirmLabel: "Activate Lockdown",
      tone: "destructive",
    });
    if (!resConfirm.confirmed) return;

    setSubmitting(true);
    try {
      await runWithBanner({
        title: `Activating ${type} lockdown`,
        successTitle: "Lockdown activated & verified",
        tone: "warning",
        task: async () => {
          const res = await fetch("/api/su/emergency/lockdown", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "activate",
              type,
              ...(type === "institute" ? { instituteId } : {}),
              restrictedServices,
              reason,
              ...(type === "global" ? { confirmPhrase } : {}),
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to activate lockdown.");
          }
          setReason("");
          setConfirmPhrase("");
          await refresh();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate lockdown.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRelease(lock: PlatformLockdownRecord) {
    const resConfirm = await confirm({
      title: `Release ${lock.type.toUpperCase()} Lockdown (${lock.id})?`,
      description:
        "Restores normal permitted access for affected users/institutes and writes an immutable audit event.",
      confirmLabel: "Release Lockdown",
      tone: "info",
      requireReason: true,
      reasonLabel: "Recovery Reason",
    });
    if (!resConfirm.confirmed) return;

    setError(null);
    try {
      await runWithBanner({
        title: `Releasing lockdown ${lock.id}`,
        successTitle: "Lockdown released",
        tone: "info",
        task: async () => {
          const res = await fetch("/api/su/emergency/lockdown", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "release",
              id: lock.id,
              reason: resConfirm.reason ?? "Released by Super Admin",
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to release lockdown.");
          }
          await refresh();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release lockdown.");
    }
  }

  const activeLockdowns = lockdowns.filter((l) => l.status === "active");

  return (
    <div className="space-y-6">
      <EmergencyHeaderBar
        title="Platform Lockdown & Emergency Access Control"
        description="Server-enforced emergency access restrictions for global, institute, authentication, or write-freeze containment."
        overallStatus={activeLockdowns.length > 0 ? "unavailable" : "healthy"}
        onRefresh={() => void refresh()}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Active Lockdowns */}
      {activeLockdowns.length > 0 && (
        <Card className="border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-300">
              <ShieldAlert className="h-4 w-4" />
              Active Lockdowns ({activeLockdowns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeLockdowns.map((lock) => (
              <div
                key={lock.id}
                className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="danger">{lock.type.toUpperCase()}</Badge>
                    {lock.instituteName && (
                      <Badge variant="outline">
                        {lock.instituteName} ({lock.instituteCode})
                      </Badge>
                    )}
                    <span className="text-muted font-mono text-xs">{lock.id}</span>
                  </div>
                  <p className="text-foreground text-sm font-medium">{lock.reason}</p>
                  <p className="text-muted text-xs">
                    Activated {formatEmergencyDate(lock.activatedAt)} by{" "}
                    <span className="font-mono">{lock.createdByUid}</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => void handleRelease(lock)}
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Release Lockdown
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Activation Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-red-600" />
            Activate Emergency Lockdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Lockdown Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as LockdownType)}
                  className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="institute">Institute-Specific Lockdown</option>
                  <option value="api_write">API Write-Freeze (Read-Only)</option>
                  <option value="admin_actions">Administrative Action Lockdown</option>
                  <option value="authentication">Authentication Lockdown</option>
                  <option value="global">Global Platform Lockdown</option>
                </select>
              </div>

              {type === "institute" && (
                <div>
                  <label className="text-foreground mb-1.5 block text-xs font-medium">
                    Target Institute
                  </label>
                  <select
                    value={instituteId}
                    onChange={(e) => setInstituteId(e.target.value)}
                    className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    {institutes.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code}) — {inst.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="border-border bg-surface rounded-lg border p-3 text-xs">
              <span className="text-foreground font-semibold">Impact Summary: </span>
              <span className="text-muted">{LOCKDOWN_DESCRIPTIONS[type]}</span>
            </div>

            {type === "institute" && (
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Optional: Restrict Specific Services Only (leave empty to lock entire
                  institute)
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {services.map((svc) => {
                    const checked = restrictedServices.includes(svc.id);
                    return (
                      <label
                        key={svc.id}
                        className="border-border flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setRestrictedServices((prev) =>
                              e.target.checked
                                ? [...prev, svc.id]
                                : prev.filter((id) => id !== svc.id)
                            )
                          }
                        />
                        <span>{svc.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Security / Operational Reason *
              </label>
              <Input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Investigating suspected credential stuffing on tenant..."
              />
            </div>

            {type === "global" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-red-600">
                  Elevated Confirmation Required: Type &quot;LOCKDOWN&quot;
                </label>
                <Input
                  required
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="LOCKDOWN"
                />
              </div>
            )}

            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Activating..." : "Activate Lockdown"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lockdown History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lockdown &amp; Recovery History</CardTitle>
        </CardHeader>
        <CardContent>
          {lockdowns.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">
              No lockdowns have been activated.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border text-muted border-b uppercase">
                  <tr>
                    <th className="py-2.5 pr-4">ID</th>
                    <th className="py-2.5 pr-4">Type / Scope</th>
                    <th className="py-2.5 pr-4">Target</th>
                    <th className="py-2.5 pr-4">Reason</th>
                    <th className="py-2.5 pr-4">Activated</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {lockdowns.map((l) => (
                    <tr key={l.id}>
                      <td className="text-muted py-2.5 pr-4 font-mono">{l.id}</td>
                      <td className="text-foreground py-2.5 pr-4 font-medium">
                        {l.type} ({l.scope})
                      </td>
                      <td className="text-muted py-2.5 pr-4">
                        {l.instituteName ?? "Platform-wide"}
                      </td>
                      <td className="text-foreground py-2.5 pr-4">{l.reason}</td>
                      <td className="text-muted py-2.5 pr-4 font-mono">
                        {formatEmergencyDate(l.activatedAt)}
                      </td>
                      <td className="py-2.5">
                        <Badge variant={l.status === "active" ? "danger" : "success"}>
                          {l.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
