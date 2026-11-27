"use client";

import * as React from "react";
import { AlertTriangle, Download, Search, ShieldAlert, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecurityAlertRecord, SecurityAlertRuleRecord } from "@/types/security";

export function SecurityAlertsClient({
  initialAlerts,
  initialRules,
}: {
  initialAlerts: SecurityAlertRecord[];
  initialRules: SecurityAlertRuleRecord[];
}) {
  const [alerts, setAlerts] = React.useState(initialAlerts);
  const [rules, setRules] = React.useState(initialRules);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [severityFilter, setSeverityFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<SecurityAlertRecord | null>(null);
  const [noteInput, setNoteInput] = React.useState("");
  const [reasonInput, setReasonInput] = React.useState("");
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (severityFilter !== "all" && a.severity !== severityFilter) return false;
      if (q) {
        return (
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          (a.relatedEmail ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alerts, statusFilter, severityFilter, search]);

  const runAlertAction = async (
    alertId: string,
    action: "acknowledge" | "investigate" | "resolve" | "false_positive" | "add_note"
  ) => {
    setLoadingId(alertId);
    try {
      const res = await fetch("/api/su/security/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "alert",
          alertId,
          action,
          note: noteInput.trim() || undefined,
          reason: reasonInput.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { alert: SecurityAlertRecord };
      };
      if (res.ok && json.ok && json.data) {
        const updated = json.data.alert;
        setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        setSelected(updated);
        setNoteInput("");
        setReasonInput("");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const toggleRule = async (rule: SecurityAlertRuleRecord) => {
    setLoadingId(rule.id);
    try {
      const res = await fetch("/api/su/security/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rule",
          id: rule.id,
          enabled: !rule.enabled,
          threshold: rule.threshold,
          windowMinutes: rule.windowMinutes,
          cooldownMinutes: rule.cooldownMinutes,
          severity: rule.severity,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { rule: SecurityAlertRuleRecord };
      };
      if (res.ok && json.ok && json.data) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? json.data!.rule : r)));
      }
    } finally {
      setLoadingId(null);
    }
  };

  const exportCsv = () => {
    const header = [
      "AlertID",
      "Severity",
      "Status",
      "Category",
      "Title",
      "EventCount",
      "LastSeenAt",
    ];
    const rows = filtered.map((a) => [
      a.id,
      a.severity,
      a.status,
      a.category,
      a.title,
      String(a.eventCount),
      a.lastSeenAt,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="text-muted absolute top-2.5 left-3 h-4 w-4"
            aria-hidden="true"
          />
          <Input
            placeholder="Search alerts, email, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Severity filter"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          aria-label="Status filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="false_positive">False Positive</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportCsv}
          leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Export CSV
        </Button>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="text-primary h-4 w-4" aria-hidden="true" />
            Security Alerts ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-muted p-6 text-center text-sm">
              No security alerts recorded matching these filters.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {filtered.map((al) => (
                <div
                  key={al.id}
                  onClick={() => setSelected(al)}
                  className="hover:bg-surface/60 flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          al.severity === "critical" || al.severity === "high"
                            ? "danger"
                            : "outline"
                        }
                      >
                        {al.severity}
                      </Badge>
                      <Badge variant="outline">{al.status}</Badge>
                      <span className="font-semibold">{al.title}</span>
                    </div>
                    <p className="text-muted">{al.summary}</p>
                  </div>
                  <div className="text-muted text-right font-mono">
                    <p>Events: {al.eventCount}</p>
                    <p>{al.lastSeenAt.slice(0, 19).replace("T", " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detection Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="text-primary h-4 w-4" aria-hidden="true" />
            Alert Detection Rules ({rules.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-border divide-y">
            {rules.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs"
              >
                <div>
                  <p className="font-semibold">
                    {r.name} <span className="text-muted font-mono">({r.id})</span>
                  </p>
                  <p className="text-muted">
                    {r.description} · Threshold: {r.threshold} / {r.windowMinutes}m ·
                    Cooldown: {r.cooldownMinutes}m
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.enabled ? "success" : "outline"}>
                    {r.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={loadingId === r.id}
                    onClick={() => toggleRule(r)}
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="border-border bg-background h-full w-full max-w-md overflow-y-auto border-l p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold">Alert Investigation</h3>
              <button
                type="button"
                aria-label="Close drawer"
                onClick={() => setSelected(null)}
                className="text-muted hover:text-foreground cursor-pointer rounded p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <p className="text-sm font-semibold">{selected.title}</p>
              <p className="text-muted">{selected.summary}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={loadingId === selected.id}
                  onClick={() => runAlertAction(selected.id, "acknowledge")}
                >
                  Acknowledge
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={loadingId === selected.id}
                  onClick={() => runAlertAction(selected.id, "investigate")}
                >
                  Investigate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  loading={loadingId === selected.id}
                  onClick={() => runAlertAction(selected.id, "resolve")}
                >
                  Resolve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={loadingId === selected.id}
                  onClick={() => runAlertAction(selected.id, "false_positive")}
                >
                  False Positive
                </Button>
              </div>
              <Input
                label="Resolution / Status Reason"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Optional reason"
              />
              <Input
                label="Add Investigation Note"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Investigation findings..."
              />
              <Button
                type="button"
                size="sm"
                loading={loadingId === selected.id}
                onClick={() => runAlertAction(selected.id, "add_note")}
              >
                Save Note
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
