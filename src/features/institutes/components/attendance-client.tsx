"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    batches[0]?.id ?? "general"
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
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const activeStudents = students.filter((s) => s.status === "active");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStudents.length === 0) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const batch = batches.find((b) => b.id === selectedBatchId);
      const res = await fetch("/api/institute/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchId,
          batchName: batch?.name ?? "General Batch",
          date,
          entries: activeStudents.map((s) => ({
            studentId: s.id,
            status: statuses[s.id] ?? "present",
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
      const listRes = await fetch(`/api/institute/attendance?date=${date}`);
      const listJson = (await listRes.json()) as {
        ok: boolean;
        data?: { records: AttendanceRecord[] };
      };
      if (listRes.ok && listJson.ok && listJson.data) {
        setRecords(listJson.data.records);
      }
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = ["Date", "Batch", "Student ID", "Student Name", "Status"];
    const rows = records.map((r) => [
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
    a.download = `attendance-${date}.csv`;
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
          <CardHeader>
            <CardTitle>Mark Daily Batch Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Batch"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  options={
                    batches.length > 0
                      ? batches.map((b) => ({
                          label: `${b.name} (${b.courseName})`,
                          value: b.id,
                        }))
                      : [{ label: "General Batch", value: "general" }]
                  }
                />
                <Input
                  label="Attendance Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {activeStudents.length === 0 ? (
                <p className="text-muted text-sm">
                  No active students found to mark attendance.
                </p>
              ) : (
                <div className="border-border overflow-x-auto rounded-xl border">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-border bg-surface text-muted border-b text-xs font-semibold uppercase">
                        <th className="px-4 py-2.5">Student ID</th>
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Batch</th>
                        <th className="px-4 py-2.5">Status</th>
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
                                  onClick={() =>
                                    setStatuses((prev) => ({ ...prev, [stu.id]: st }))
                                  }
                                  className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${
                                    statuses[stu.id] === st
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
                Save Attendance
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendance History</CardTitle>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
            onClick={exportCsv}
            disabled={records.length === 0}
          >
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
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
                  {records.slice(0, 50).map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4 font-mono text-xs">{r.date}</td>
                      <td className="text-muted py-2 pr-4 text-xs">{r.batchName}</td>
                      <td className="py-2 pr-4">
                        {r.studentName} ({r.studentCode})
                      </td>
                      <td className="py-2">
                        <Badge
                          variant={
                            r.status === "present"
                              ? "success"
                              : r.status === "absent"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {r.status}
                        </Badge>
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
