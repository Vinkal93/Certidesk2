"use client";

import * as React from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CourseRecord, CourseSubject } from "@/types/academic";

export function CoursesClient({
  initialCourses,
  canWrite,
}: {
  initialCourses: CourseRecord[];
  canWrite: boolean;
}) {
  const [courses, setCourses] = React.useState(initialCourses);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [durationMonths, setDurationMonths] = React.useState("12");
  const [monthlyFeeRupees, setMonthlyFeeRupees] = React.useState("500");
  const [admissionFeeRupees, setAdmissionFeeRupees] = React.useState("300");
  const [duration, setDuration] = React.useState("12 Months");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "inactive">("active");
  const [subjects, setSubjects] = React.useState<CourseSubject[]>([
    { id: "sub_1", name: "", code: "SUB-01", order: 1, maxMarks: 100 },
  ]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const parsedMonths = Math.max(0, Number(durationMonths) || 0);
  const parsedMonthly = Math.max(0, Number(monthlyFeeRupees) || 0);
  const parsedAdmission = Math.max(0, Number(admissionFeeRupees) || 0);
  const computedTuitionRupees = parsedMonths * parsedMonthly;
  const computedTotalRupees = computedTuitionRupees + parsedAdmission;

  const addSubjectRow = () => {
    const nextOrder = subjects.length + 1;
    setSubjects((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}_${nextOrder}`,
        name: "",
        code: `SUB-0${nextOrder}`,
        order: nextOrder,
        maxMarks: 100,
      },
    ]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const validSubjects = subjects.filter((s) => s.name.trim().length > 0);
      const res = await fetch("/api/institute/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          duration: duration.trim() || `${parsedMonths || 1} Months`,
          durationMonths: parsedMonths > 0 ? parsedMonths : undefined,
          monthlyFeeRupees: parsedMonthly,
          admissionFeeRupees: parsedAdmission,
          feeRupees: computedTotalRupees,
          description,
          status,
          subjects: validSubjects,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { course: CourseRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create course.");
        return;
      }
      setCourses((prev) => [json.data!.course, ...prev]);
      setName("");
      setCode("");
      setDuration("");
      setDescription("");
      setSubjects([
        { id: `sub_${Date.now()}`, name: "", code: "SUB-01", order: 1, maxMarks: 100 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        {courses.length === 0 ? (
          <Card>
            <CardContent className="text-muted py-10 text-center text-sm">
              No courses configured yet. Create your first course with custom subjects.
            </CardContent>
          </Card>
        ) : (
          courses.map((course) => (
            <Card key={course.id}>
              <CardHeader className="border-border flex flex-row items-start justify-between border-b pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{course.code}</Badge>
                    <Badge variant={course.status === "active" ? "success" : "default"}>
                      {course.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{course.name}</CardTitle>
                  <p className="text-muted text-xs">
                    Duration: {course.duration} &bull; Total Fee: ₹
                    {(course.feePaise / 100).toFixed(2)}
                    {course.monthlyFeePaise ? (
                      <>
                        {" "}
                        ({course.durationMonths ?? "?"}m &times; ₹
                        {(course.monthlyFeePaise / 100).toFixed(0)}
                        {course.admissionFeePaise
                          ? ` + ₹${(course.admissionFeePaise / 100).toFixed(0)} adm.`
                          : ""}
                        )
                      </>
                    ) : null}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-sm">
                {course.description && (
                  <p className="text-muted mb-3">{course.description}</p>
                )}
                <p className="text-muted mb-2 text-xs font-semibold uppercase">
                  Custom Subjects ({course.subjects.length})
                </p>
                {course.subjects.length === 0 ? (
                  <p className="text-muted text-xs">No subjects added.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {course.subjects.map((sub) => (
                      <Badge key={sub.id} variant="primary">
                        {sub.order}. {sub.name} ({sub.maxMarks}m)
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {canWrite && (
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Create Course &amp; Subjects</CardTitle>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Course Name"
                  placeholder="e.g. Full Stack Web"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Course Code"
                  placeholder="e.g. FSWD"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  label="Duration (Months)"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="12"
                  value={durationMonths}
                  onChange={(e) => {
                    setDurationMonths(e.target.value);
                    const m = Number(e.target.value);
                    if (m > 0) setDuration(`${m} Months`);
                  }}
                  required
                />
                <Input
                  label="Monthly Fee (₹)"
                  type="number"
                  min="0"
                  placeholder="500"
                  value={monthlyFeeRupees}
                  onChange={(e) => setMonthlyFeeRupees(e.target.value)}
                  required
                />
                <Input
                  label="Admission Fee (₹)"
                  type="number"
                  min="0"
                  placeholder="300"
                  value={admissionFeeRupees}
                  onChange={(e) => setAdmissionFeeRupees(e.target.value)}
                />
              </div>

              <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-xs">
                <span className="text-muted">
                  Auto Calculation:{" "}
                  <strong className="text-foreground">
                    {parsedMonths} &times; ₹{parsedMonthly.toLocaleString("en-IN")}
                  </strong>{" "}
                  = ₹{computedTuitionRupees.toLocaleString("en-IN")} + ₹
                  {parsedAdmission.toLocaleString("en-IN")} admission
                </span>
                <span className="text-primary text-sm font-bold tabular-nums">
                  Total: ₹{computedTotalRupees.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Duration Label"
                  placeholder="12 Months"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
                <Select
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                  ]}
                />
              </div>
              <Textarea
                label="Description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="border-border space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-foreground text-xs font-semibold uppercase">
                    Subjects
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSubjectRow}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add Subject
                  </Button>
                </div>
                {subjects.map((sub, idx) => (
                  <div key={sub.id} className="flex items-center gap-2">
                    <Input
                      placeholder={`Subject ${idx + 1}`}
                      value={sub.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubjects((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, name: val } : item
                          )
                        );
                      }}
                    />
                    <Input
                      type="number"
                      className="w-20"
                      value={String(sub.maxMarks)}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 100;
                        setSubjects((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, maxMarks: val } : item
                          )
                        );
                      }}
                    />
                    {subjects.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSubjects((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="text-danger h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button type="submit" fullWidth loading={loading}>
                Save Course
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
