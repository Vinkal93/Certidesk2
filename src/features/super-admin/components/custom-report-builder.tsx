"use client";

import * as React from "react";
import { Calendar, Download, Play, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ApprovedReportDataset,
  ReportDefinitionRecord,
  ReportRange,
  ReportScheduleRecord,
} from "@/types/reports";

export function CustomReportBuilder({
  defaultCategory,
  defaultDataset,
}: {
  defaultCategory: "business" | "financial" | "usage" | "security";
  defaultDataset: ApprovedReportDataset;
}) {
  const [dataset, setDataset] = React.useState<ApprovedReportDataset>(defaultDataset);
  const [range, setRange] = React.useState<ReportRange>("30d");
  const [rows, setRows] = React.useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = React.useState<number | null>(null);
  const [defName, setDefName] = React.useState("");
  const [schedName, setSchedName] = React.useState("");
  const [schedEmail, setSchedEmail] = React.useState("");
  const [definitions, setDefinitions] = React.useState<ReportDefinitionRecord[]>([]);
  const [schedules, setSchedules] = React.useState<ReportScheduleRecord[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/su/reports/custom")
      .then((r) => r.json())
      .then(
        (json: {
          ok: boolean;
          data?: {
            definitions: ReportDefinitionRecord[];
            schedules: ReportScheduleRecord[];
          };
        }) => {
          if (json.ok && json.data) {
            setDefinitions(json.data.definitions);
            setSchedules(json.data.schedules);
          }
        }
      )
      .catch(() => undefined);
  }, []);

  const runReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/su/reports/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", dataset, range }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { rows: Array<Record<string, unknown>>; total: number };
      };
      if (res.ok && json.ok && json.data) {
        setRows(json.data.rows);
        setTotal(json.data.total);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveDef = async () => {
    if (!defName.trim()) return;
    const res = await fetch("/api/su/reports/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_definition",
        name: defName,
        category: defaultCategory,
        dataset,
        range,
      }),
    });
    const json = (await res.json()) as {
      ok: boolean;
      data?: { definition: ReportDefinitionRecord };
    };
    if (res.ok && json.ok && json.data) {
      setDefinitions((prev) => [json.data!.definition, ...prev]);
      setDefName("");
    }
  };

  const saveSched = async () => {
    if (!schedName.trim() || !schedEmail.trim()) return;
    const res = await fetch("/api/su/reports/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_schedule",
        name: schedName,
        category: defaultCategory,
        cadence: "weekly",
        timezone: "Asia/Kolkata",
        recipients: [schedEmail.trim()],
        enabled: true,
      }),
    });
    const json = (await res.json()) as {
      ok: boolean;
      data?: { schedule: ReportScheduleRecord };
    };
    if (res.ok && json.ok && json.data) {
      setSchedules((prev) => [json.data!.schedule, ...prev]);
      setSchedName("");
      setSchedEmail("");
    }
  };

  const cols = rows.length > 0 ? Object.keys(rows[0]!) : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            Custom Report Builder (Approved Datasets Only)
          </CardTitle>
          <a
            href={`/api/su/reports/export?dataset=${encodeURIComponent(dataset)}&range=${encodeURIComponent(range)}&format=csv`}
            className="border-border hover:bg-surface inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Audited CSV Export
          </a>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              aria-label="Approved dataset"
              value={dataset}
              onChange={(e) => setDataset(e.target.value as ApprovedReportDataset)}
              className="border-border bg-background h-9 rounded-lg border px-2.5"
            >
              <option value="institutes">Institutes</option>
              <option value="wallet_transactions">Wallet Ledger</option>
              <option value="payment_orders">Razorpay Payment Orders</option>
              <option value="billing_invoices">Billing Invoices</option>
              <option value="security_login_events">Security Login Events</option>
              <option value="audit_logs">Immutable Audit Logs</option>
            </select>
            <select
              aria-label="Date range"
              value={range}
              onChange={(e) => setRange(e.target.value as ReportRange)}
              className="border-border bg-background h-9 rounded-lg border px-2.5"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <Button
              type="button"
              size="sm"
              loading={loading}
              onClick={runReport}
              leftIcon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Run Query
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Save configuration name..."
              value={defName}
              onChange={(e) => setDefName(e.target.value)}
              className="h-9 max-w-xs text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={saveDef}
              leftIcon={<Save className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Save Config
            </Button>
          </div>

          {total !== null && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              {rows.length === 0 ? (
                <p className="text-muted p-4 text-xs">
                  No records returned for {dataset} ({range}).
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-border bg-surface text-muted border-b">
                    <tr>
                      {cols.map((c) => (
                        <th key={c} className="px-3 py-2 font-mono">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {rows.slice(0, 20).map((row, idx) => (
                      <tr key={idx}>
                        {cols.map((c) => (
                          <td key={c} className="px-3 py-2 font-mono">
                            {String(row[c] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="text-primary h-4 w-4" aria-hidden="true" />
            Saved &amp; Scheduled Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="space-y-2">
            <Input
              placeholder="Schedule name (e.g. Weekly Summary)"
              value={schedName}
              onChange={(e) => setSchedName(e.target.value)}
              className="h-9 text-xs"
            />
            <Input
              placeholder="Recipient email"
              type="email"
              value={schedEmail}
              onChange={(e) => setSchedEmail(e.target.value)}
              className="h-9 text-xs"
            />
            <Button type="button" size="sm" variant="outline" onClick={saveSched}>
              Add Weekly Schedule
            </Button>
          </div>

          <div className="border-t pt-3">
            <p className="font-semibold">Saved Definitions ({definitions.length})</p>
            <div className="mt-1.5 space-y-1">
              {definitions.slice(0, 5).map((d) => (
                <div key={d.id} className="bg-surface flex justify-between rounded p-2">
                  <span>{d.name}</span>
                  <Badge variant="outline">{d.dataset}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="font-semibold">Schedules ({schedules.length})</p>
            <div className="mt-1.5 space-y-1">
              {schedules.slice(0, 5).map((s) => (
                <div key={s.id} className="bg-surface flex justify-between rounded p-2">
                  <span>{s.name}</span>
                  <Badge variant="outline">{s.lastDeliveryStatus}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
