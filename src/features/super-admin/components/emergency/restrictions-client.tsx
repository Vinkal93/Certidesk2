"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, RotateCcw } from "lucide-react";
import { useActionFeedback } from "@/components/ui/action-feedback-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  RestrictionType,
  ServiceRegistryDefinition,
  ServiceRestrictionRecord,
} from "@/types/emergency";
import { EmergencyHeaderBar, formatEmergencyDate } from "./emergency-shared";

interface ServiceRow extends ServiceRegistryDefinition {
  activeRestrictions: ServiceRestrictionRecord[];
  effectiveStatus: "operational" | "read_only" | "restricted";
}

interface Props {
  initialServices: ServiceRow[];
  initialRestrictions: ServiceRestrictionRecord[];
  institutes: Array<{ id: string; name: string; code: string }>;
}

export function RestrictionsClient({
  initialServices,
  initialRestrictions,
  institutes,
}: Props) {
  const router = useRouter();
  const { confirm, runWithBanner } = useActionFeedback();
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [restrictions, setRestrictions] =
    useState<ServiceRestrictionRecord[]>(initialRestrictions);

  const [serviceId, setServiceId] = useState(initialServices[0]?.id ?? "certificates");
  const [restrictionType, setRestrictionType] =
    useState<RestrictionType>("global_disable");
  const [scope, setScope] = useState<"global" | "institute">("global");
  const [selectedInstitutes, setSelectedInstitutes] = useState<string[]>([]);
  const [disabledOps, setDisabledOps] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [userMessage, setUserMessage] = useState(
    "This service is temporarily restricted for operational verification."
  );
  const [expiresAt, setExpiresAt] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 8;
  const selectedService = services.find((s) => s.id === serviceId);

  async function refresh() {
    const res = await fetch("/api/su/emergency/restrictions", { cache: "no-store" });
    const json = (await res.json()) as {
      data?: {
        services: ServiceRow[];
        restrictions: ServiceRestrictionRecord[];
      };
    };
    if (res.ok && json.data) {
      setServices(json.data.services);
      setRestrictions(json.data.restrictions);
    }
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const resConfirm = await confirm({
      title: `Restrict "${selectedService?.name ?? serviceId}"?`,
      description: `Type: ${restrictionType} | Scope: ${scope}. Users attempting restricted actions will receive a server-enforced error.`,
      confirmLabel: "Apply Restriction",
      tone: "warning",
    });
    if (!resConfirm.confirmed) return;

    setSubmitting(true);
    try {
      await runWithBanner({
        title: `Applying restriction on ${serviceId}`,
        successTitle: "Service restriction enforced",
        tone: "warning",
        task: async () => {
          const res = await fetch("/api/su/emergency/restrictions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "create",
              serviceId,
              restrictionType,
              scope,
              instituteIds: scope === "institute" ? selectedInstitutes : [],
              disabledOperations:
                restrictionType === "operation_disable" ? disabledOps : [],
              reason,
              userMessage,
              ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to apply restriction.");
          }
          setReason("");
          setDisabledOps([]);
          await refresh();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply restriction.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRestore(r: ServiceRestrictionRecord) {
    const resConfirm = await confirm({
      title: `Restore "${r.serviceId}" (${r.id})?`,
      description:
        "Removes only this restriction while preserving any other active service restrictions.",
      confirmLabel: "Restore Service",
      tone: "info",
      requireReason: true,
      reasonLabel: "Restoration Reason",
    });
    if (!resConfirm.confirmed) return;

    setError(null);
    try {
      await runWithBanner({
        title: `Restoring ${r.serviceId}`,
        successTitle: "Restriction removed",
        tone: "info",
        task: async () => {
          const res = await fetch("/api/su/emergency/restrictions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "restore",
              id: r.id,
              reason: resConfirm.reason ?? "Restored by Super Admin",
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to restore service.");
          }
          await refresh();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore service.");
    }
  }

  const categories = Array.from(new Set(services.map((s) => s.category)));
  const filteredServices = services.filter((s) => {
    if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
    if (statusFilter !== "all" && s.effectiveStatus !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  const pagedServices = filteredServices.slice((page - 1) * pageSize, page * pageSize);

  const activeRestrictions = restrictions.filter((r) => r.status === "active");

  return (
    <div className="space-y-6">
      <EmergencyHeaderBar
        title="Service Restrictions & Module Controls"
        description="Granular backend-enforced controls for individual CertiDesk Pro services, operations, read-only freezes, and institute-scoped pauses."
        overallStatus={activeRestrictions.length > 0 ? "degraded" : "healthy"}
        onRefresh={() => void refresh()}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Service Registry Table */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Platform Service Registry ({filteredServices.length})
            </CardTitle>
            <p className="text-muted text-xs">
              Real CertiDesk Pro modules enforced at API and portal boundaries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search service..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-44 text-xs"
            />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="border-border bg-card text-foreground h-9 rounded-lg border px-2.5 text-xs"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border-border bg-card text-foreground h-9 rounded-lg border px-2.5 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="operational">Operational</option>
              <option value="read_only">Read-Only</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-border text-muted border-b uppercase">
                <tr>
                  <th className="py-2.5 pr-4">Service</th>
                  <th className="py-2.5 pr-4">Category</th>
                  <th className="py-2.5 pr-4">Criticality</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Active Policies</th>
                  <th className="py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {pagedServices.map((svc) => (
                  <tr key={svc.id}>
                    <td className="py-3 pr-4">
                      <p className="text-foreground font-medium">{svc.name}</p>
                      <p className="text-muted text-[11px]">{svc.description}</p>
                    </td>
                    <td className="text-muted py-3 pr-4">{svc.category}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline">{svc.criticality}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          svc.effectiveStatus === "operational"
                            ? "success"
                            : svc.effectiveStatus === "read_only"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {svc.effectiveStatus}
                      </Badge>
                    </td>
                    <td className="text-muted py-3 pr-4 font-mono">
                      {svc.activeRestrictions.length}
                    </td>
                    <td className="py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setServiceId(svc.id)}
                      >
                        Configure
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-muted">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configure New Service Restriction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ban className="h-4 w-4 text-amber-600" />
            Apply Service Restriction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Target Service
              </label>
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setDisabledOps([]);
                }}
                className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Restriction Type
              </label>
              <select
                value={restrictionType}
                onChange={(e) => {
                  const val = e.target.value as RestrictionType;
                  setRestrictionType(val);
                  if (val === "institute_disable") setScope("institute");
                }}
                className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="global_disable">Disable Service Globally</option>
                <option value="institute_disable">Disable for Selected Institutes</option>
                <option value="read_only">Read-Only Mode (Block Writes)</option>
                <option value="operation_disable">Disable Selected Operations</option>
                <option value="temporary">Temporary Restriction (with Expiry)</option>
                <option value="scheduled">Scheduled Restriction</option>
              </select>
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "global" | "institute")}
                className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="global">Global (All Institutes)</option>
                <option value="institute">Selected Institutes Only</option>
              </select>
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Auto-Expiry Timestamp (optional)
              </label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            {restrictionType === "operation_disable" && selectedService && (
              <div className="md:col-span-2">
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Select Operations to Disable
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedService.operations.map((op) => (
                    <label
                      key={op}
                      className="border-border flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={disabledOps.includes(op)}
                        onChange={(e) =>
                          setDisabledOps((prev) =>
                            e.target.checked
                              ? [...prev, op]
                              : prev.filter((x) => x !== op)
                          )
                        }
                      />
                      <span className="font-mono">{op}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {scope === "institute" && (
              <div className="md:col-span-2">
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Affected Institutes
                </label>
                <div className="grid max-h-36 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {institutes.map((inst) => (
                    <label
                      key={inst.id}
                      className="border-border flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInstitutes.includes(inst.id)}
                        onChange={(e) =>
                          setSelectedInstitutes((prev) =>
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

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Operational Reason *
              </label>
              <Input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Razorpay webhook maintenance"
              />
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                User-Facing Error Message *
              </label>
              <Input
                required
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Applying..." : "Enforce Service Restriction"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active & Historical Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Active &amp; Historical Restrictions ({restrictions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {restrictions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-600" />
              <p className="text-muted text-sm">
                All platform services are operating without restrictions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {restrictions.map((r) => (
                <div
                  key={r.id}
                  className="border-border flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground font-mono text-sm font-semibold">
                        {r.serviceId}
                      </span>
                      <Badge
                        variant={
                          r.status === "active"
                            ? "danger"
                            : r.status === "scheduled"
                              ? "warning"
                              : "success"
                        }
                      >
                        {r.status}
                      </Badge>
                      <Badge variant="outline">{r.restrictionType}</Badge>
                      <Badge variant="outline">{r.scope}</Badge>
                    </div>
                    <p className="text-foreground text-xs">{r.reason}</p>
                    <p className="text-muted text-[11px]">
                      Created {formatEmergencyDate(r.createdAt)}
                      {r.expiresAt
                        ? ` • Expires ${formatEmergencyDate(r.expiresAt)}`
                        : ""}
                    </p>
                  </div>
                  {(r.status === "active" || r.status === "scheduled") && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleRestore(r)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
