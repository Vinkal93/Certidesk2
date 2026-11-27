"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecurityLoginEventRecord } from "@/types/security";

export function SecurityLoginsClient({
  initialEvents,
}: {
  initialEvents: SecurityLoginEventRecord[];
}) {
  const [events, setEvents] = React.useState(initialEvents);
  const [search, setSearch] = React.useState("");
  const [resultFilter, setResultFilter] = React.useState("all");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<SecurityLoginEventRecord | null>(null);
  const [noteInput, setNoteInput] = React.useState("");
  const [savingNote, setSavingNote] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (resultFilter !== "all" && e.result !== resultFilter) return false;
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (q) {
        return (
          e.identifier.toLowerCase().includes(q) ||
          (e.ipAddress ?? "").toLowerCase().includes(q) ||
          (e.userId ?? "").toLowerCase().includes(q) ||
          (e.failureCategory ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, search, resultFilter, roleFilter]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !noteInput.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/su/security/logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selected.id, note: noteInput }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { event: SecurityLoginEventRecord };
      };
      if (res.ok && json.ok && json.data) {
        const updated = json.data.event;
        setSelected(updated);
        setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
        setNoteInput("");
      }
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="text-muted absolute top-2.5 left-3 h-4 w-4"
            aria-hidden="true"
          />
          <Input
            placeholder="Search email, UID, IP, or failure category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Result filter"
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
        >
          <option value="all">All results</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="blocked">Blocked</option>
        </select>
        <select
          aria-label="Role filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
        >
          <option value="all">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="institute_admin">Institute Admin</option>
          <option value="staff">Staff</option>
          <option value="student">Student</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Authentication Events ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-muted p-6 text-center text-sm">
              No authentication events match your filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border bg-surface text-muted border-b">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Account / Identifier</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Result</th>
                    <th className="px-4 py-2.5">IP</th>
                    <th className="px-4 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {filtered.map((ev) => (
                    <tr
                      key={ev.id}
                      onClick={() => setSelected(ev)}
                      className="hover:bg-surface/60 cursor-pointer"
                    >
                      <td className="text-muted px-4 py-2.5 font-mono">
                        {ev.timestamp.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{ev.identifier}</p>
                        {ev.failureCategory && (
                          <p className="text-danger">{ev.failureCategory}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">{ev.role}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={
                            ev.result === "success"
                              ? "success"
                              : ev.result === "blocked"
                                ? "danger"
                                : "outline"
                          }
                        >
                          {ev.result}
                        </Badge>
                      </td>
                      <td className="text-muted px-4 py-2.5 font-mono">
                        {ev.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Button type="button" size="sm" variant="ghost">
                          Inspect
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

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="border-border bg-background h-full w-full max-w-md overflow-y-auto border-l p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold">Login Event Details</h3>
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
                <span className="text-muted">Correlation ID: </span>
                <span className="font-mono">{selected.correlationId}</span>
              </div>
              <div>
                <span className="text-muted">Identifier: </span>
                <span className="font-semibold">{selected.identifier}</span>
              </div>
              <div>
                <span className="text-muted">User ID: </span>
                <span className="font-mono">{selected.userId ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted">Session ID: </span>
                <span className="font-mono">{selected.sessionId ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted">User Agent: </span>
                <span className="break-all">{selected.userAgent ?? "—"}</span>
              </div>

              <div className="border-t pt-3">
                <p className="font-semibold">Investigation Notes</p>
                {(selected.notes ?? []).length === 0 ? (
                  <p className="text-muted mt-1">No investigation notes yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {selected.notes.map((n, idx) => (
                      <li key={idx} className="bg-surface rounded-lg p-2">
                        <p>{n.note}</p>
                        <p className="text-muted mt-0.5 text-[10px]">
                          {n.authorUid} · {n.createdAt.slice(0, 19)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={handleAddNote} className="mt-3 space-y-2">
                  <Input
                    placeholder="Add investigation note..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                  />
                  <Button type="submit" size="sm" loading={savingNote}>
                    Save Note
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
