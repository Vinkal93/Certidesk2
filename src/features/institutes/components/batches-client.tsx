"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BatchRecord, CourseRecord } from "@/types/academic";
import type { UserProfileRecord } from "@/types/domain";

export function BatchesClient({
  initialBatches,
  courses,
  staffList,
  canWrite,
}: {
  initialBatches: BatchRecord[];
  courses: CourseRecord[];
  staffList: UserProfileRecord[];
  canWrite: boolean;
}) {
  const [batches, setBatches] = React.useState(initialBatches);
  const [name, setName] = React.useState("");
  const [courseId, setCourseId] = React.useState(courses[0]?.id ?? "");
  const [timing, setTiming] = React.useState("");
  const [teacherUid, setTeacherUid] = React.useState("");
  const [capacity, setCapacity] = React.useState("30");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/institute/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          courseId,
          timing,
          teacherUid: teacherUid || null,
          capacity: Number(capacity),
          status: "active",
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { batch: BatchRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create batch.");
        return;
      }
      setBatches((prev) => [json.data!.batch, ...prev]);
      setName("");
      setTiming("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-7">
        {batches.length === 0 ? (
          <Card>
            <CardContent className="text-muted py-10 text-center text-sm">
              No batches created yet.
            </CardContent>
          </Card>
        ) : (
          <div className="border-border bg-background overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[540px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border bg-surface/60 text-muted border-b text-xs font-semibold uppercase">
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Timing</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-border/70 divide-y">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="text-muted px-4 py-3">{b.courseName}</td>
                    <td className="px-4 py-3 text-xs">{b.timing}</td>
                    <td className="text-muted px-4 py-3 text-xs">
                      {b.teacherName ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-xs">{b.capacity}</td>
                    <td className="px-4 py-3">
                      <Badge variant={b.status === "active" ? "success" : "default"}>
                        {b.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canWrite && (
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Create Batch</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div
                role="alert"
                className="bg-danger-soft text-danger mb-4 flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Batch Name"
                placeholder="e.g. Morning Batch A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Select
                label="Course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                options={
                  courses.length > 0
                    ? courses.map((c) => ({ label: c.name, value: c.id }))
                    : [{ label: "Create a course first", value: "" }]
                }
                required
              />
              <Input
                label="Timing"
                placeholder="Mon–Fri, 10:00 AM – 12:00 PM"
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
                required
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Assign Teacher"
                  value={teacherUid}
                  onChange={(e) => setTeacherUid(e.target.value)}
                  options={[
                    { label: "Unassigned", value: "" },
                    ...staffList.map((s) => ({ label: s.displayName, value: s.uid })),
                  ]}
                />
                <Input
                  label="Capacity"
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={courses.length === 0}
              >
                Create Batch
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
