"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, RotateCcw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FeatureFlagRecord } from "@/services/feature-flags.service";

interface Props {
  initialFlags: FeatureFlagRecord[];
}

export function FeatureFlagsClient({ initialFlags }: Props) {
  const router = useRouter();
  const [flags, setFlags] = useState<FeatureFlagRecord[]>(initialFlags);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [planAllowlist, setPlanAllowlist] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/su/feature-flags", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { data?: { flags: FeatureFlagRecord[] } };
      if (json.data?.flags) setFlags(json.data.flags);
    }
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/su/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          key,
          name,
          description,
          globalEnabled,
          killSwitchActive,
          planAllowlist: planAllowlist
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          reason,
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to save feature flag.");
      }
      setNotice(`Feature flag "${key}" saved.`);
      setKey("");
      setName("");
      setDescription("");
      setReason("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feature flag.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleKillSwitch(flag: FeatureFlagRecord) {
    const nextKill = !flag.killSwitchActive;
    const changeReason = window.prompt(
      `Reason for ${nextKill ? "ACTIVATING kill switch" : "deactivating kill switch"} on ${flag.key}:`
    );
    if (!changeReason?.trim()) return;
    setError(null);
    const res = await fetch("/api/su/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert",
        key: flag.key,
        name: flag.name,
        description: flag.description,
        globalEnabled: flag.globalEnabled,
        killSwitchActive: nextKill,
        planAllowlist: flag.planAllowlist,
        instituteOverrides: flag.instituteOverrides,
        reason: changeReason.trim(),
      }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: { message?: string } };
      setError(json.error?.message ?? "Failed to toggle kill switch.");
      return;
    }
    setNotice(`Updated kill switch for ${flag.key}.`);
    await refresh();
  }

  async function handleRollback(flag: FeatureFlagRecord, targetVersion: number) {
    const changeReason = window.prompt(
      `Reason for rolling back ${flag.key} to v${targetVersion}:`
    );
    if (!changeReason?.trim()) return;
    setError(null);
    const res = await fetch("/api/su/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rollback",
        key: flag.key,
        targetVersion,
        reason: changeReason.trim(),
      }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: { message?: string } };
      setError(json.error?.message ?? "Failed to rollback feature flag.");
      return;
    }
    setNotice(`Rolled back ${flag.key} to v${targetVersion}.`);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-primary" />
            Create or Update Feature Flag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Flag Key
              </label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. bulk_certificate_issuance"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Display Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bulk Certificate Issuance"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Controls batch PDF generation and QR stamping"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Plan Allowlist (comma-separated IDs, optional)
              </label>
              <Input
                value={planAllowlist}
                onChange={(e) => setPlanAllowlist(e.target.value)}
                placeholder="pro, enterprise"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Audit Reason (Required)
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enable for enterprise rollout"
                required
              />
            </div>
            <div className="flex flex-wrap items-center gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={globalEnabled}
                  onChange={(e) => setGlobalEnabled(e.target.checked)}
                />
                Globally Enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-destructive">
                <input
                  type="checkbox"
                  checked={killSwitchActive}
                  onChange={(e) => setKillSwitchActive(e.target.checked)}
                />
                Kill Switch Active (Forces OFF everywhere)
              </label>
            </div>
            {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
            {notice && <p className="text-sm text-emerald-600 md:col-span-2">{notice}</p>}
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Feature Flag"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Platform Feature Flags ({flags.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No feature flags configured yet. Create a flag above to control module rollouts and kill switches.
            </p>
          ) : (
            flags.map((flag) => (
              <div
                key={flag.key}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{flag.key}</span>
                    <Badge variant={flag.killSwitchActive ? "danger" : flag.globalEnabled ? "success" : "outline"}>
                      {flag.killSwitchActive
                        ? "KILL SWITCH ACTIVE"
                        : flag.globalEnabled
                          ? "Enabled"
                          : "Disabled"}
                    </Badge>
                    <Badge variant="outline">v{flag.version}</Badge>
                  </div>
                  <p className="text-sm font-medium">{flag.name}</p>
                  {flag.description && (
                    <p className="text-xs text-muted-foreground">{flag.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(flag.updatedAt).toLocaleString()} • Plans:{" "}
                    {flag.planAllowlist.length > 0 ? flag.planAllowlist.join(", ") : "All plans"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={flag.killSwitchActive ? "outline" : "destructive"}
                    onClick={() => handleToggleKillSwitch(flag)}
                  >
                    <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                    {flag.killSwitchActive ? "Release Kill Switch" : "Trigger Kill Switch"}
                  </Button>
                  {flag.history.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRollback(flag, flag.history[0]!.version)}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Rollback to v{flag.history[0]!.version}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
