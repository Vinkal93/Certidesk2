"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, HardDrive, LifeBuoy, Play, ShieldCheck } from "lucide-react";
import { useActionFeedback } from "@/components/ui/action-feedback-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  HealthCheckSample,
  IncidentRecord,
  MaintenanceEventRecord,
  PlatformLockdownRecord,
  RecoveryOperationRecord,
  RecoveryStepRecord,
  RecoveryType,
  ServiceRegistryDefinition,
  ServiceRestrictionRecord,
} from "@/types/emergency";
import { EmergencyHeaderBar, formatEmergencyDate } from "./emergency-shared";

interface Props {
  initialData: {
    operations: RecoveryOperationRecord[];
    steps: RecoveryStepRecord[];
    health: HealthCheckSample;
    activeMaintenances: MaintenanceEventRecord[];
    activeLockdowns: PlatformLockdownRecord[];
    activeRestrictions: ServiceRestrictionRecord[];
    incidents: IncidentRecord[];
    services: ServiceRegistryDefinition[];
    backupConfig: {
      configured: boolean;
      provider: string;
      bucketReference: string | null;
      status: string;
    };
  };
}

export function RecoveryClient({ initialData }: Props) {
  const router = useRouter();
  const { confirm, runWithBanner } = useActionFeedback();
  const [data, setData] = useState(initialData);

  const [recoveryType, setRecoveryType] = useState<RecoveryType>("verify_firestore");
  const [relatedIncidentId, setRelatedIncidentId] = useState("");
  const [targetResourceId, setTargetResourceId] = useState("");
  const [objective, setObjective] = useState("");
  const [impactAssessment, setImpactAssessment] = useState("");
  const [priority, setPriority] = useState<"p1" | "p2" | "p3">("p2");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/su/emergency/recovery", { cache: "no-store" });
    const json = (await res.json()) as { data?: Props["initialData"] };
    if (res.ok && json.data) {
      setData(json.data);
    }
    router.refresh();
  }

  async function handleAssess(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await runWithBanner({
        title: "Creating recovery assessment",
        successTitle: "Recovery assessment logged",
        tone: "info",
        task: async () => {
          const res = await fetch("/api/su/emergency/recovery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "assess",
              recoveryType,
              ...(relatedIncidentId ? { relatedIncidentId } : {}),
              ...(targetResourceId ? { targetResourceId } : {}),
              objective,
              impactAssessment,
              priority,
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to create assessment.");
          }
          setObjective("");
          setImpactAssessment("");
          await refresh();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(op: RecoveryOperationRecord) {
    setError(null);
    await runWithBanner({
      title: `Approving ${op.id}`,
      successTitle: "Recovery approved",
      tone: "info",
      task: async () => {
        const res = await fetch("/api/su/emergency/recovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve", id: op.id }),
        });
        const json = (await res.json()) as { error?: { message?: string } };
        if (!res.ok) {
          throw new Error(json.error?.message ?? "Failed to approve operation.");
        }
        await refresh();
      },
    });
  }

  async function handleExecute(op: RecoveryOperationRecord) {
    const resConfirm = await confirm({
      title: `Execute Recovery ${op.id}?`,
      description: `Objective: ${op.objective}. This will execute the real backend recovery action and run live post-recovery verification.`,
      confirmLabel: "Execute & Verify",
      tone: op.priority === "p1" ? "destructive" : "warning",
      requireReason: true,
      reasonLabel: "Execution Reason",
    });
    if (!resConfirm.confirmed) return;

    setError(null);
    try {
      await runWithBanner({
        title: `Executing ${op.id}`,
        successTitle: "Recovery executed & verified",
        tone: "info",
        task: async () => {
          const res = await fetch("/api/su/emergency/recovery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "execute",
              id: op.id,
              reason: resConfirm.reason ?? "Executed by Super Admin",
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Recovery execution failed.");
          }
          await refresh();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery failed.");
      await refresh();
    }
  }

  const completedCount = data.operations.filter((o) => o.status === "completed").length;
  const failedCount = data.operations.filter((o) => o.status === "failed").length;
  const pendingCount = data.operations.filter(
    (o) => o.status === "assessed" || o.status === "approved"
  ).length;
  const awaitingRestoration =
    data.activeMaintenances.length +
    data.activeLockdowns.length +
    data.activeRestrictions.length;

  return (
    <div className="space-y-6">
      <EmergencyHeaderBar
        title="Recovery & Verification Operations"
        description="Controlled, approval-gated recovery workflows with live post-execution service verification and honest backup provider status."
        overallStatus={data.health.overallStatus}
        checkedAt={data.health.checkedAt}
        onRefresh={() => void refresh()}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Awaiting Restoration</p>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {awaitingRestoration}
            </p>
            <p className="text-muted mt-1 text-xs">
              Active maintenances, lockdowns &amp; restrictions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Pending Tasks</p>
            <p className="text-foreground mt-1 text-2xl font-bold">{pendingCount}</p>
            <p className="text-muted mt-1 text-xs">Assessed or approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Completed Recoveries</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{completedCount}</p>
            <p className="text-muted mt-1 text-xs">Verified post-execution</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Failed Recoveries</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{failedCount}</p>
            <p className="text-muted mt-1 text-xs">Requires SRE follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Backup Integration Status (Honest Reporting) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Backup Provider &amp; Disaster Recovery Status
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs sm:grid-cols-4">
          <div>
            <p className="text-muted uppercase">Provider</p>
            <p className="text-foreground mt-1 font-medium">
              {data.backupConfig.provider}
            </p>
          </div>
          <div>
            <p className="text-muted uppercase">Integration Status</p>
            <div className="mt-1">
              <Badge variant={data.backupConfig.configured ? "success" : "outline"}>
                {data.backupConfig.status}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-muted uppercase">Storage Reference</p>
            <p className="text-foreground mt-1 font-mono">
              {data.backupConfig.bucketReference ?? "Not Configured"}
            </p>
          </div>
          <div>
            <p className="text-muted uppercase">Dependency Note</p>
            <p className="text-muted mt-1">
              {data.backupConfig.configured
                ? "Automated Firestore export bucket configured."
                : "Configure FIREBASE_BACKUP_BUCKET & Cloud Scheduler to enable automated backup restores."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Assessment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="h-4 w-4 text-blue-600" />
            Create Recovery Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAssess} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Recovery Workflow
              </label>
              <select
                value={recoveryType}
                onChange={(e) => {
                  setRecoveryType(e.target.value as RecoveryType);
                  setTargetResourceId("");
                }}
                className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="verify_firestore">
                  Verify Cloud Firestore Connectivity
                </option>
                <option value="verify_auth">Verify Firebase Auth Availability</option>
                <option value="verify_app_health">
                  Verify Application Runtime Health
                </option>
                <option value="verify_razorpay">Verify Razorpay Gateway Status</option>
                <option value="restore_service">Restore Restricted Service</option>
                <option value="end_maintenance">End Active Maintenance Window</option>
                <option value="release_lockdown">Release Active Platform Lockdown</option>
              </select>
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "p1" | "p2" | "p3")}
                className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="p1">P1 — Critical (Requires Explicit Approval)</option>
                <option value="p2">P2 — High</option>
                <option value="p3">P3 — Standard</option>
              </select>
            </div>

            {(recoveryType === "restore_service" ||
              recoveryType === "end_maintenance" ||
              recoveryType === "release_lockdown") && (
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Target Active Resource *
                </label>
                <select
                  required
                  value={targetResourceId}
                  onChange={(e) => setTargetResourceId(e.target.value)}
                  className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="">Select active resource...</option>
                  {recoveryType === "restore_service" &&
                    data.activeRestrictions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} — {r.serviceId} ({r.restrictionType})
                      </option>
                    ))}
                  {recoveryType === "end_maintenance" &&
                    data.activeMaintenances.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} — {m.name}
                      </option>
                    ))}
                  {recoveryType === "release_lockdown" &&
                    data.activeLockdowns.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id} — {l.type} ({l.reason})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Related Incident (optional)
              </label>
              <select
                value={relatedIncidentId}
                onChange={(e) => setRelatedIncidentId(e.target.value)}
                className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="">None</option>
                {data.incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id} — {inc.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Recovery Objective *
              </label>
              <Input
                required
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Restore certificate issuance after template validation fix"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Impact Assessment *
              </label>
              <Input
                required
                value={impactAssessment}
                onChange={(e) => setImpactAssessment(e.target.value)}
                placeholder="Expected user impact and post-recovery verification criteria..."
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Creating..." : "Create Recovery Assessment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recovery Operations Queue & History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recovery Queue &amp; Execution History ({data.operations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.operations.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">
              No recovery operations logged yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.operations.map((op) => {
                const opSteps = data.steps
                  .filter((s) => s.recoveryId === op.id)
                  .sort((a, b) => a.stepOrder - b.stepOrder);
                return (
                  <div
                    key={op.id}
                    className="border-border space-y-3 rounded-xl border p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted font-mono text-xs">{op.id}</span>
                          <Badge variant="outline">{op.recoveryType}</Badge>
                          <Badge
                            variant={
                              op.status === "completed"
                                ? "success"
                                : op.status === "failed"
                                  ? "danger"
                                  : op.status === "approved"
                                    ? "primary"
                                    : "warning"
                            }
                          >
                            {op.status}
                          </Badge>
                          <Badge variant="outline">{op.priority.toUpperCase()}</Badge>
                        </div>
                        <p className="text-foreground text-sm font-semibold">
                          {op.objective}
                        </p>
                        <p className="text-muted text-xs">
                          Created {formatEmergencyDate(op.createdAt)}
                          {op.verificationResult
                            ? ` • Verification: ${op.verificationResult}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {op.status === "assessed" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleApprove(op)}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                        )}
                        {op.status === "approved" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => void handleExecute(op)}
                          >
                            <Play className="h-3.5 w-3.5" />
                            Execute &amp; Verify
                          </Button>
                        )}
                      </div>
                    </div>

                    {opSteps.length > 0 && (
                      <div className="border-border bg-surface space-y-1.5 rounded-lg border p-3 text-xs">
                        {opSteps.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-foreground flex items-center gap-1.5">
                              <CheckCircle2
                                className={`h-3.5 w-3.5 ${
                                  st.status === "completed"
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              />
                              Step {st.stepOrder}: {st.label} ({st.detail})
                            </span>
                            <span className="text-muted font-mono text-[11px]">
                              {st.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
