"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Download, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceRecord, AttendanceStatus, BatchRecord } from "@/types/academic";
import type { StudentRecord } from "@/types/domain";

export function AttendanceClient({
  batches,
  students,
  initialRecords,
  canWrite,
}: {
  batches: BatchRecord[];
  students: StudentRecord[];
  initialRecords: AttendanceRecord[];
  canWrite: boolean;
}) {
  const [selectedBatchId, setSelectedBatchId] = React.useState(
    batches[0]?.id ?? "__ALL__"
  );
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = React.useState(initialRecords);
  const [statuses, setStatuses] = React.useState<Record<string, AttendanceStatus>>(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const s of students) {
      map[s.id] = "present";
    }
    return map;
  });

  // History filters
  const [historyBatchFilter, setHistoryBatchFilter] = React.useState("__ALL__");
  const [historyDateFilter, setHistoryDateFilter] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [autoSavingId, setAutoSavingId] = React.useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const selectedBatch = React.useMemo(
    () => batches.find((b) => b.id === selectedBatchId),
    [batches, selectedBatchId]
  );

  // Filter active students strictly by selected batch (unless All Batches selected)
  const activeStudents = React.useMemo(() => {
    const active = students.filter((s) => s.status === "active");
    if (selectedBatchId === "__ALL__" || selectedBatchId === "general") {
      return active;
    }
    const targetName = selectedBatch?.name.trim().toLowerCase() ?? "";
    return active.filter((s) => {
      if (s.batchId && s.batchId === selectedBatchId) return true;
      if (targetName && s.batchName?.trim().toLowerCase() === targetName) return true;
      return false;
    });
  }, [students, selectedBatchId, selectedBatch]);

  // Derive displayed statuses from saved records for selected date + local overrides
  const effectiveStatuses = React.useMemo(() => {
    const next: Record<string, AttendanceStatus> = { ...statuses };
    for (const r of records) {
      if (r.date === date && !(r.studentId in statuses)) {
        next[r.studentId] = r.status;
      }
    }
    return next;
  }, [date, records, statuses]);

  const refreshRecordsForDate = async (targetDate: string) => {
    const listRes = await fetch(`/api/institute/attendance?date=${targetDate}`);
    const listJson = (await listRes.json()) as {
      ok: boolean;
      data?: { records: AttendanceRecord[] };
    };
    if (listRes.ok && listJson.ok && listJson.data) {
      setRecords((prev) => {
        const otherDates = prev.filter((r) => r.date !== targetDate);
        return [...listJson.data!.records, ...otherDates].sort((a, b) =>
          b.date.localeCompare(a.date)
        );
      });
    }
  };

  // Auto-save individual student status immediately on click
  const handleStatusClick = async (stu: StudentRecord, nextStatus: AttendanceStatus) => {
    setStatuses((prev) => ({ ...prev, [stu.id]: nextStatus }));
    setAutoSavingId(stu.id);
    setAutoSaveStatus("Saving...");
    setError(null);
    try {
      const batchIdToUse =
        selectedBatchId === "__ALL__" ? stu.batchId || "general" : selectedBatchId;
      const batchNameToUse =
        selectedBatchId === "__ALL__"
          ? stu.batchName || "General Batch"
          : (selectedBatch?.name ?? stu.batchName ?? "General Batch");

      const res = await fetch("/api/institute/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: batchIdToUse,
          batchName: batchNameToUse,
          date,
          entries: [{ studentId: stu.id, status: nextStatus }],
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Auto-save failed.");
        setAutoSaveStatus(null);
        return;
      }
      setAutoSaveStatus(`Auto-saved ${stu.fullName} (${nextStatus})`);
      await refreshRecordsForDate(date);
    } catch {
      setError("Network error during auto-save.");
      setAutoSaveStatus(null);
    } finally {
      setAutoSavingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStudents.length === 0) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const batchIdToUse = selectedBatchId === "__ALL__" ? "general" : selectedBatchId;
      const batchNameToUse =
        selectedBatchId === "__ALL__"
          ? "All Batches"
          : (selectedBatch?.name ?? "General Batch");

      const res = await fetch("/api/institute/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: batchIdToUse,
          batchName: batchNameToUse,
          date,
          entries: activeStudents.map((s) => ({
            studentId: s.id,
            status: effectiveStatuses[s.id] ?? "present",
          })),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { savedCount: number; updatedCount: number };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to save attendance.");
        return;
      }
      setMessage(
        `Attendance saved (${json.data.savedCount} new, ${json.data.updatedCount} updated).`
      );
      await refreshRecordsForDate(date);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      if (historyDateFilter && r.date !== historyDateFilter) return false;
      if (historyBatchFilter !== "__ALL__") {
        const b = batches.find((x) => x.id === historyBatchFilter);
        const matchesId = r.batchId === historyBatchFilter;
        const matchesName =
          b && r.batchName.trim().toLowerCase() === b.name.trim().toLowerCase();
        if (!matchesId && !matchesName) return false;
      }
      return true;
    });
  }, [batches, historyBatchFilter, historyDateFilter, records]);

  const exportCsv = () => {
    const header = ["Date", "Batch", "Student ID", "Student Name", "Status"];
    const rows = filteredRecords.map((r) => [
      r.date,
      r.batchName,
      r.studentCode,
      r.studentName,
      r.status,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${historyDateFilter || date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {canWrite && (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Mark Daily Batch Attendance</CardTitle>
            {autoSaveStatus ? (
              <span className="text-success inline-flex items-center gap-1.5 text-xs font-medium">
                {autoSavingId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {autoSaveStatus}
              </span>
            ) : null}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Batch Filter"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  options={[
                    { label: "All Batches", value: "__ALL__" },
                    ...batches.map((b) => ({
                      label: `${b.name} (${b.courseName})`,
                      value: b.id,
                    })),
                  ]}
                />
                <Input
                  label="Attendance Date *"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {activeStudents.length === 0 ? (
                <p className="text-muted py-4 text-sm">
                  No active students found in the selected batch.
                </p>
              ) : (
                <div className="border-border overflow-x-auto rounded-xl border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-border bg-surface text-muted border-b text-xs font-semibold uppercase">
                        <th className="px-4 py-2.5">Student ID</th>
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Batch</th>
                        <th className="px-4 py-2.5">Status (Auto-Saves)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/70 divide-y">
                      {activeStudents.map((stu) => (
                        <tr key={stu.id}>
                          <td className="px-4 py-2.5 font-mono text-xs">
                            {stu.studentCode}
                          </td>
                          <td className="px-4 py-2.5 font-medium">{stu.fullName}</td>
                          <td className="text-muted px-4 py-2.5 text-xs">
                            {stu.batchName}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="inline-flex gap-1.5">
                              {(["present", "absent", "leave"] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={autoSavingId === stu.id}
                                  onClick={() => void handleStatusClick(stu, st)}
                                  className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                                    effectiveStatuses[stu.id] === st
                                      ? st === "present"
                                        ? "bg-success border-emerald-600 text-white"
                                        : st === "absent"
                                          ? "bg-danger border-red-600 text-white"
                                          : "bg-warning border-amber-600 text-white"
                                      : "border-border bg-background text-muted hover:text-foreground"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                disabled={activeStudents.length === 0}
              >
                Save All Attendance ({activeStudents.length})
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Attendance History ({filteredRecords.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={historyBatchFilter}
              onChange={(e) => setHistoryBatchFilter(e.target.value)}
              options={[
                { label: "All Batches", value: "__ALL__" },
                ...batches.map((b) => ({ label: b.name, value: b.id })),
              ]}
            />
            <Input
              type="date"
              value={historyDateFilter}
              onChange={(e) => setHistoryDateFilter(e.target.value)}
              aria-label="Filter history by date"
            />
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
              onClick={exportCsv}
              disabled={filteredRecords.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <p className="text-muted text-sm">No attendance records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border text-muted border-b text-xs uppercase">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Batch</th>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {filteredRecords.slice(0, 100).map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4 font-mono text-xs">{r.date}</td>
                      <td className="text-muted py-2 pr-4 text-xs">{r.batchName}</td>
                      <td className="py-2 pr-4">
                        {r.studentName} ({r.studentCode})
                      </td>
                      <td className="py-2">
                        <StatusChip status={r.status} />
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
