"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { useActionFeedback } from "@/components/ui/action-feedback-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  EnterpriseIncidentSeverity,
  IncidentCategory,
  IncidentRecord,
  ServiceRegistryDefinition,
} from "@/types/emergency";
import { EmergencyHeaderBar, formatEmergencyDate } from "./emergency-shared";

interface Props {
  initialIncidents: IncidentRecord[];
  services: ServiceRegistryDefinition[];
  institutes: Array<{ id: string; name: string; code: string }>;
  operators: Array<{ uid: string; email: string; displayName: string }>;
}

export function IncidentsEnterpriseClient({
  initialIncidents,
  services,
  institutes,
  operators,
}: Props) {
  const router = useRouter();
  const { runWithBanner } = useActionFeedback();
  const [incidents, setIncidents] = useState<IncidentRecord[]>(initialIncidents);
  const [nowMs] = useState<number>(() => Date.now());
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IncidentCategory>("availability");
  const [severity, setSeverity] = useState<EnterpriseIncidentSeverity>("high");
  const [affectedServices, setAffectedServices] = useState<string[]>([]);
  const [affectedInstituteIds, setAffectedInstituteIds] = useState<string[]>([]);
  const [detectionSource, setDetectionSource] = useState("Super Admin Console");
  const [assignedToUid, setAssignedToUid] = useState(operators[0]?.uid ?? "");
  const [impactDescription, setImpactDescription] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/su/emergency/incidents", { cache: "no-store" });
    const json = (await res.json()) as { data?: { incidents: IncidentRecord[] } };
    if (res.ok && json.data) {
      setIncidents(json.data.incidents);
    }
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await runWithBanner({
        title: "Declaring platform incident",
        successTitle: "Incident declared & audited",
        tone: severity === "critical" ? "warning" : "info",
        task: async () => {
          const res = await fetch("/api/su/emergency/incidents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              description,
              category,
              severity,
              affectedServices,
              affectedInstituteIds,
              detectionSource,
              ...(assignedToUid ? { assignedToUid } : {}),
              ...(impactDescription ? { impactDescription } : {}),
              ...(internalNotes ? { internalNotes } : {}),
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to create incident.");
          }
          setTitle("");
          setDescription("");
          setImpactDescription("");
          setInternalNotes("");
          setShowCreate(false);
          await refresh();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create incident.");
    } finally {
      setSubmitting(false);
    }
  }

  const openCount = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "closed"
  ).length;
  const criticalCount = incidents.filter(
    (i) => i.severity === "critical" && i.status !== "resolved" && i.status !== "closed"
  ).length;
  const investigatingCount = incidents.filter(
    (i) => i.status === "investigating" || i.status === "mitigating"
  ).length;
  const resolvedCount = incidents.filter(
    (i) => i.status === "resolved" || i.status === "closed"
  ).length;
  const overdueCount = incidents.filter((i) => {
    if (i.status === "resolved" || i.status === "closed") return false;
    const ageHours = (nowMs - new Date(i.createdAt).getTime()) / 3_600_000;
    return ageHours > 24;
  }).length;

  const filtered = incidents.filter((i) => {
    if (sevFilter !== "all" && i.severity !== sevFilter) return false;
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.title.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <EmergencyHeaderBar
        title="Platform Incident Management"
        description="End-to-end incident lifecycle tracking from detection through acknowledgement, mitigation, and post-resolution closure."
        overallStatus={
          criticalCount > 0 ? "unavailable" : openCount > 0 ? "degraded" : "healthy"
        }
        onRefresh={() => void refresh()}
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" />
            {showCreate ? "Close Form" : "Declare Incident"}
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total Incidents", value: incidents.length },
          { label: "Open Incidents", value: openCount },
          { label: "Critical Open", value: criticalCount },
          { label: "Investigating", value: investigatingCount },
          { label: "Resolved / Closed", value: resolvedCount },
          { label: "Overdue (>24h)", value: overdueCount },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-muted text-[11px] font-medium uppercase">{k.label}</p>
              <p className="text-foreground mt-1 text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incident Creation Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Declare New Platform Incident
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Incident Title *
                </label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Razorpay webhook signature latency spike"
                />
              </div>

              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                  className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="availability">Availability</option>
                  <option value="security">Security</option>
                  <option value="payments">Payments</option>
                  <option value="authentication">Authentication</option>
                  <option value="data_integrity">Data Integrity</option>
                  <option value="performance">Performance</option>
                  <option value="integration">Integration</option>
                </select>
              </div>

              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) =>
                    setSeverity(e.target.value as EnterpriseIncidentSeverity)
                  }
                  className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Informational</option>
                </select>
              </div>

              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Detection Source
                </label>
                <Input
                  value={detectionSource}
                  onChange={(e) => setDetectionSource(e.target.value)}
                />
              </div>

              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Assign Operator
                </label>
                <select
                  value={assignedToUid}
                  onChange={(e) => setAssignedToUid(e.target.value)}
                  className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {operators.map((op) => (
                    <option key={op.uid} value={op.uid}>
                      {op.displayName} ({op.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Affected Services
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className="border-border flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={affectedServices.includes(s.id)}
                        onChange={(e) =>
                          setAffectedServices((prev) =>
                            e.target.checked
                              ? [...prev, s.id]
                              : prev.filter((x) => x !== s.id)
                          )
                        }
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {institutes.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-foreground mb-1.5 block text-xs font-medium">
                    Affected Institutes (optional)
                  </label>
                  <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-3">
                    {institutes.map((inst) => (
                      <label
                        key={inst.id}
                        className="border-border flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={affectedInstituteIds.includes(inst.id)}
                          onChange={(e) =>
                            setAffectedInstituteIds((prev) =>
                              e.target.checked
                                ? [...prev, inst.id]
                                : prev.filter((x) => x !== inst.id)
                            )
                          }
                        />
                        <span className="truncate">
                          {inst.name} ({inst.code})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Description *
                </label>
                <Input
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed technical symptoms & scope..."
                />
              </div>

              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Customer / Institute Impact
                </label>
                <Input
                  value={impactDescription}
                  onChange={(e) => setImpactDescription(e.target.value)}
                  placeholder="e.g. Wallet recharge confirmation delayed"
                />
              </div>

              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Internal Operator Notes
                </label>
                <Input
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Incident"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Incidents Table */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Incident Queue ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search title, ID, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 text-xs"
            />
            <select
              value={sevFilter}
              onChange={(e) => setSevFilter(e.target.value)}
              className="border-border bg-card text-foreground h-9 rounded-lg border px-2.5 text-xs"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-border bg-card text-foreground h-9 rounded-lg border px-2.5 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="detected">Detected</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="investigating">Investigating</option>
              <option value="mitigating">Mitigating</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">
              No incidents recorded. Click &quot;Declare Incident&quot; to log your first
              tracked incident.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((inc) => (
                <Link
                  key={inc.id}
                  href={`/su/emergency/incidents/${inc.id}`}
                  className="border-border hover:bg-surface flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          inc.severity === "critical"
                            ? "danger"
                            : inc.severity === "high"
                              ? "warning"
                              : "outline"
                        }
                      >
                        {inc.severity.toUpperCase()}
                      </Badge>
                      <Badge
                        variant={
                          inc.status === "resolved" || inc.status === "closed"
                            ? "success"
                            : "primary"
                        }
                      >
                        {inc.status}
                      </Badge>
                      <span className="text-muted font-mono text-xs">{inc.id}</span>
                      <span className="text-foreground text-sm font-semibold">
                        {inc.title}
                      </span>
                    </div>
                    <p className="text-muted text-xs">
                      Category: {inc.category} &bull; Created{" "}
                      {formatEmergencyDate(inc.createdAt)}
                      {inc.affectedServices.length > 0
                        ? ` • Services: ${inc.affectedServices.join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-primary flex items-center gap-1 text-xs font-medium">
                    Open Incident
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
