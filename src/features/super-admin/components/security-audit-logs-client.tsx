"use client";

import * as React from "react";
import { Download, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditLogRecord } from "@/types/domain";

export function SecurityAuditLogsClient({
  initialLogs,
  initialTotal,
  initialTotalPages,
}: {
  initialLogs: AuditLogRecord[];
  initialTotal: number;
  initialTotalPages: number;
}) {
  const [logs, setLogs] = React.useState(initialLogs);
  const [total, setTotal] = React.useState(initialTotal);
  const [totalPages, setTotalPages] = React.useState(initialTotalPages);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<AuditLogRecord | null>(null);

  const fetchLogs = async (nextPage = 1, nextSearch = search, nextRole = roleFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "25",
        actorRole: nextRole,
        ...(nextSearch.trim() ? { search: nextSearch.trim() } : {}),
      });
      const res = await fetch(`/api/su/audit-logs?${params.toString()}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          items: AuditLogRecord[];
          total: number;
          totalPages: number;
          page: number;
        };
      };
      if (res.ok && json.ok && json.data) {
        setLogs(json.data.items);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
        setPage(json.data.page);
      }
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = [
      "ID",
      "Timestamp",
      "Action",
      "ActorUID",
      "ActorRole",
      "InstituteId",
      "TargetId",
    ];
    const rows = logs.map((l) => [
      l.id,
      l.createdAt,
      l.action,
      l.actorUid,
      l.actorRole,
      l.instituteId ?? "",
      l.targetId ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="text-muted absolute top-2.5 left-3 h-4 w-4"
            aria-hidden="true"
          />
          <Input
            placeholder="Search action, actor UID, institute ID, or target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs(1, search, roleFilter)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Actor role filter"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            fetchLogs(1, search, e.target.value);
          }}
          className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
        >
          <option value="all">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="institute_admin">Institute Admin</option>
          <option value="staff">Staff</option>
          <option value="student">Student</option>
          <option value="system">System</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={loading}
          onClick={() => fetchLogs(1, search, roleFilter)}
        >
          Apply
        </Button>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Append-Only Audit Trail ({total} records)
          </CardTitle>
          <span className="text-muted text-xs">
            Page {page} of {totalPages}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="text-muted p-6 text-center text-sm">
              No audit logs match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border bg-surface text-muted border-b">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Actor</th>
                    <th className="px-4 py-2.5">Institute</th>
                    <th className="px-4 py-2.5">Target</th>
                    <th className="px-4 py-2.5">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="hover:bg-surface/60 cursor-pointer"
                    >
                      <td className="text-muted px-4 py-2.5 font-mono">
                        {log.createdAt.replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{log.actorRole}</span>
                        <span className="text-muted ml-1.5 font-mono">
                          {log.actorUid.slice(0, 12)}
                        </span>
                      </td>
                      <td className="text-muted px-4 py-2.5 font-mono">
                        {log.instituteId ?? "—"}
                      </td>
                      <td className="text-muted px-4 py-2.5 font-mono">
                        {log.targetId ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Button type="button" size="sm" variant="ghost">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => fetchLogs(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages || loading}
          onClick={() => fetchLogs(page + 1)}
        >
          Next
        </Button>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="border-border bg-background h-full w-full max-w-md overflow-y-auto border-l p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold">Immutable Audit Record</h3>
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
              <div>
                <span className="text-muted">Event ID: </span>
                <span className="font-mono">{selected.id}</span>
              </div>
              <div>
                <span className="text-muted">Action: </span>
                <Badge variant="outline">{selected.action}</Badge>
              </div>
              <div>
                <span className="text-muted">Actor UID: </span>
                <span className="font-mono">{selected.actorUid}</span> (
                {selected.actorRole})
              </div>
              <div>
                <span className="text-muted">Institute ID: </span>
                <span className="font-mono">{selected.instituteId ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted">Target ID: </span>
                <span className="font-mono">{selected.targetId ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted">Timestamp: </span>
                <span className="font-mono">{selected.createdAt}</span>
              </div>
              <div className="border-t pt-3">
                <p className="mb-1 font-semibold">Redacted Metadata</p>
                <pre className="bg-surface overflow-x-auto rounded-lg p-3 font-mono text-[11px]">
                  {JSON.stringify(selected.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
