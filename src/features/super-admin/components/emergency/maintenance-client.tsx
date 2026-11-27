"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Wrench, XCircle } from "lucide-react";
import { useActionFeedback } from "@/components/ui/action-feedback-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  MaintenanceEventRecord,
  MaintenanceScope,
  MaintenanceType,
  ServiceRegistryDefinition,
} from "@/types/emergency";
import { EmergencyHeaderBar, formatEmergencyDate } from "./emergency-shared";

interface Props {
  initialEvents: MaintenanceEventRecord[];
  institutes: Array<{ id: string; name: string; code: string }>;
  services: ServiceRegistryDefinition[];
}

export function MaintenanceClient({ initialEvents, institutes, services }: Props) {
  const router = useRouter();
  const { confirm, runWithBanner } = useActionFeedback();
  const [events, setEvents] = useState<MaintenanceEventRecord[]>(initialEvents);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MaintenanceType>("scheduled");
  const [scope, setScope] = useState<MaintenanceScope>("platform");
  const [affectedServices, setAffectedServices] = useState<string[]>([]);
  const [affectedInstituteIds, setAffectedInstituteIds] = useState<string[]>([]);
  const [startAt, setStartAt] = useState(() =>
    new Date(Date.now() + 15 * 60_000).toISOString().slice(0, 16)
  );
  const [expectedEndAt, setExpectedEndAt] = useState(() =>
    new Date(Date.now() + 75 * 60_000).toISOString().slice(0, 16)
  );
  const [publicMessage, setPublicMessage] = useState(
    "CertiDesk Pro is undergoing scheduled maintenance to improve reliability. Normal access will resume shortly."
  );
  const [internalNotes, setInternalNotes] = useState("");
  const [notifyInstitutes, setNotifyInstitutes] = useState(true);
  const [activateImmediately, setActivateImmediately] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshList() {
    const res = await fetch("/api/su/emergency/maintenance", { cache: "no-store" });
    const json = (await res.json()) as {
      data?: { events: MaintenanceEventRecord[] };
    };
    if (res.ok && json.data) {
      setEvents(json.data.events);
    }
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const impactText =
      scope === "platform"
        ? "All Institute & Student portals will display the maintenance screen. Super Admin recovery access remains active."
        : scope === "services"
          ? `${affectedServices.length} selected service(s) will be paused.`
          : `${affectedInstituteIds.length} selected institute(s) will be placed into maintenance.`;

    const resConfirm = await confirm({
      title: activateImmediately
        ? `Activate Maintenance: "${name}"?`
        : `Schedule Maintenance: "${name}"?`,
      description: `${impactText} Reason: ${description}`,
      confirmLabel: activateImmediately ? "Activate Maintenance" : "Schedule Window",
      tone: activateImmediately ? "destructive" : "warning",
    });
    if (!resConfirm.confirmed) return;

    setSubmitting(true);
    try {
      await runWithBanner({
        title: activateImmediately
          ? "Activating platform maintenance"
          : "Scheduling maintenance window",
        successTitle: "Maintenance event saved",
        tone: "info",
        task: async () => {
          const res = await fetch("/api/su/emergency/maintenance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "create",
              name,
              description,
              type,
              scope,
              affectedServices,
              affectedInstituteIds,
              startAt: new Date(startAt).toISOString(),
              expectedEndAt: new Date(expectedEndAt).toISOString(),
              publicMessage,
              internalNotes: internalNotes || undefined,
              notifyInstitutes,
              activateImmediately,
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to save maintenance event.");
          }
          setName("");
          setDescription("");
          setInternalNotes("");
          await refreshList();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save maintenance.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManage(
    ev: MaintenanceEventRecord,
    action: "disable" | "cancel" | "extend"
  ) {
    const resConfirm = await confirm({
      title:
        action === "disable"
          ? `End active maintenance "${ev.name}"?`
          : action === "cancel"
            ? `Cancel scheduled maintenance "${ev.name}"?`
            : `Extend maintenance "${ev.name}" by 30 minutes?`,
      description: "This state change is recorded in the emergency audit log.",
      confirmLabel:
        action === "disable"
          ? "End Maintenance"
          : action === "cancel"
            ? "Cancel Schedule"
            : "Extend +30m",
      tone: action === "disable" ? "info" : "warning",
      requireReason: true,
      reasonLabel: "Operational Reason",
    });
    if (!resConfirm.confirmed) return;

    setError(null);
    try {
      await runWithBanner({
        title: `Updating maintenance ${ev.id}`,
        successTitle: "Maintenance updated",
        tone: "info",
        task: async () => {
          const nextEnd = new Date(
            Math.max(new Date().getTime(), new Date(ev.expectedEndAt).getTime()) +
              30 * 60_000
          ).toISOString();
          const res = await fetch("/api/su/emergency/maintenance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              id: ev.id,
              reason: resConfirm.reason ?? "Updated by Super Admin",
              ...(action === "extend" ? { expectedEndAt: nextEnd } : {}),
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to update maintenance.");
          }
          await refreshList();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update maintenance.");
    }
  }

  const activeEvents = events.filter((e) => e.status === "active");
  const scheduledEvents = events.filter((e) => e.status === "scheduled");
  const completedEvents = events.filter((e) => e.status === "completed");

  const filtered = events.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <EmergencyHeaderBar
        title="Maintenance Mode Control"
        description="Safely activate or schedule platform, service, or institute maintenance windows. Super Admin recovery access is always preserved."
        overallStatus={activeEvents.length > 0 ? "degraded" : "healthy"}
        onRefresh={() => void refreshList()}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-muted text-xs font-medium">Active Windows</p>
              <p className="text-foreground mt-1 text-2xl font-bold">
                {activeEvents.length}
              </p>
            </div>
            <Wrench className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-muted text-xs font-medium">Scheduled Windows</p>
              <p className="text-foreground mt-1 text-2xl font-bold">
                {scheduledEvents.length}
              </p>
            </div>
            <CalendarClock className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-muted text-xs font-medium">Completed Windows</p>
              <p className="text-foreground mt-1 text-2xl font-bold">
                {completedEvents.length}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configure Maintenance Window</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Maintenance Name *
              </label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Firestore Index & Razorpay Webhook Upgrade"
              />
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Maintenance Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MaintenanceType)}
                className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="scheduled">Scheduled Maintenance</option>
                <option value="full_platform">Full Platform Maintenance</option>
                <option value="selected_service">Selected Service Maintenance</option>
                <option value="selected_institute">Selected Institute Maintenance</option>
                <option value="emergency">Emergency Maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Target Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as MaintenanceScope)}
                className="border-border bg-card text-foreground h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="platform">Entire Platform</option>
                <option value="services">Specific Services</option>
                <option value="institutes">Specific Institutes</option>
              </select>
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Operational Reason / Description *
              </label>
              <Input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Required for audit log..."
              />
            </div>

            {scope === "services" && (
              <div className="md:col-span-2">
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Affected Services
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {services.map((svc) => {
                    const checked = affectedServices.includes(svc.id);
                    return (
                      <label
                        key={svc.id}
                        className="border-border flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setAffectedServices((prev) =>
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

            {scope === "institutes" && (
              <div className="md:col-span-2">
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Affected Institutes
                </label>
                <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {institutes.map((inst) => {
                    const checked = affectedInstituteIds.includes(inst.id);
                    return (
                      <label
                        key={inst.id}
                        className="border-border flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setAffectedInstituteIds((prev) =>
                              e.target.checked
                                ? [...prev, inst.id]
                                : prev.filter((id) => id !== inst.id)
                            )
                          }
                        />
                        <span className="truncate">
                          {inst.name} ({inst.code})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Start Date &amp; Time
              </label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                disabled={activateImmediately}
              />
            </div>

            <div>
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Expected End Date &amp; Time *
              </label>
              <Input
                type="datetime-local"
                required
                value={expectedEndAt}
                onChange={(e) => setExpectedEndAt(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Public Maintenance Message *
              </label>
              <Input
                required
                value={publicMessage}
                onChange={(e) => setPublicMessage(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-foreground mb-1.5 block text-xs font-medium">
                Internal Operational Notes
              </label>
              <Input
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Runbook link or operator handoff notes..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 md:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={activateImmediately}
                  onChange={(e) => setActivateImmediately(e.target.checked)}
                />
                <span>Activate immediately (instead of scheduling)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={notifyInstitutes}
                  onChange={(e) => setNotifyInstitutes(e.target.checked)}
                />
                <span>Mark institutes for maintenance banner notice</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={submitting}
                variant={activateImmediately ? "destructive" : "primary"}
              >
                {submitting
                  ? "Saving..."
                  : activateImmediately
                    ? "Enable Maintenance Now"
                    : "Schedule Maintenance Window"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Maintenance History & Active Controls */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Maintenance History &amp; Active Windows
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search maintenance..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 text-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-border bg-card text-foreground h-9 rounded-lg border px-2.5 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted py-8 text-center text-sm">
              No maintenance events recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((ev) => (
                <div
                  key={ev.id}
                  className="border-border flex flex-col justify-between gap-4 rounded-xl border p-4 lg:flex-row lg:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-semibold">
                        {ev.name}
                      </span>
                      <Badge
                        variant={
                          ev.status === "active"
                            ? "danger"
                            : ev.status === "scheduled"
                              ? "warning"
                              : ev.status === "completed"
                                ? "success"
                                : "outline"
                        }
                      >
                        {ev.status}
                      </Badge>
                      <Badge variant="outline">{ev.scope}</Badge>
                      <span className="text-muted font-mono text-[11px]">{ev.id}</span>
                    </div>
                    <p className="text-muted text-xs">{ev.description}</p>
                    <p className="text-muted text-[11px]">
                      Window: {formatEmergencyDate(ev.startAt)} &rarr;{" "}
                      {formatEmergencyDate(ev.expectedEndAt)}
                      {ev.actualEndAt
                        ? ` (Ended: ${formatEmergencyDate(ev.actualEndAt)})`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ev.status === "active" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleManage(ev, "extend")}
                        >
                          Extend +30m
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={() => void handleManage(ev, "disable")}
                        >
                          Disable Maintenance
                        </Button>
                      </>
                    )}
                    {ev.status === "scheduled" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleManage(ev, "cancel")}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
