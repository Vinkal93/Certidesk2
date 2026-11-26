"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  BatchRecord,
  ExamSubject,
  ExaminationRecord,
  StudentMarksheetRecord,
} from "@/types/academic";
import type { StudentRecord } from "@/types/domain";

export function ExamsClient({
  batches,
  students,
  initialExams,
  initialMarksheets,
  canWrite,
}: {
  batches: BatchRecord[];
  students: StudentRecord[];
  initialExams: ExaminationRecord[];
  initialMarksheets: StudentMarksheetRecord[];
  canWrite: boolean;
}) {
  const [exams, setExams] = React.useState(initialExams);
  const [marksheets, setMarksheets] = React.useState(initialMarksheets);

  const [title, setTitle] = React.useState("");
  const [batchId, setBatchId] = React.useState(batches[0]?.id ?? "general");
  const [examDate, setExamDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [subjects, setSubjects] = React.useState<ExamSubject[]>([
    { id: "esub_1", name: "Core Theory", maxMarks: 100, passingMarks: 35 },
  ]);

  const [selectedExamId, setSelectedExamId] = React.useState(initialExams[0]?.id ?? "");
  const [selectedStudentId, setSelectedStudentId] = React.useState(students[0]?.id ?? "");
  const [obtainedMap, setObtainedMap] = React.useState<Record<string, string>>({});

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const batch = batches.find((b) => b.id === batchId);
      const res = await fetch("/api/institute/examinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_exam",
          title,
          batchId,
          batchName: batch?.name ?? "General Batch",
          examDate,
          subjects: subjects.filter((s) => s.name.trim().length > 0),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { exam: ExaminationRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create exam.");
        return;
      }
      setExams((prev) => [json.data!.exam, ...prev]);
      setSelectedExamId(json.data.exam.id);
      setTitle("");
      setMessage("Examination created.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/examinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enter_marks",
          examId: selectedExam.id,
          studentId: selectedStudentId,
          marks: selectedExam.subjects.map((sub) => ({
            subjectId: sub.id,
            obtainedMarks: Number(obtainedMap[sub.id] ?? 0),
          })),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { marksheet: StudentMarksheetRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to save marks.");
        return;
      }
      setMarksheets((prev) => [
        json.data!.marksheet,
        ...prev.filter((m) => m.id !== json.data!.marksheet.id),
      ]);
      setMessage(
        `Marks saved for ${json.data.marksheet.studentName}: ${json.data.marksheet.percentage}% (${json.data.marksheet.grade})`
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (examId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/institute/examinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_exam", examId }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { exam: ExaminationRecord };
      };
      if (res.ok && json.ok && json.data) {
        setExams((prev) => prev.map((ex) => (ex.id === examId ? json.data!.exam : ex)));
        setMarksheets((prev) =>
          prev.map((m) => (m.examId === examId ? { ...m, published: true } : m))
        );
        setMessage("Examination results published.");
      }
    } finally {
      setLoading(false);
    }
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Examination</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateExam} className="space-y-3.5">
                <Input
                  label="Examination Title"
                  placeholder="e.g. Mid-Term Evaluation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Batch"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    options={
                      batches.length > 0
                        ? batches.map((b) => ({ label: b.name, value: b.id }))
                        : [{ label: "General Batch", value: "general" }]
                    }
                  />
                  <Input
                    label="Exam Date"
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    required
                  />
                </div>
                <div className="border-border space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-muted text-xs font-semibold uppercase">
                      Custom Subjects
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSubjects((prev) => [
                          ...prev,
                          {
                            id: `esub_${Date.now()}`,
                            name: "",
                            maxMarks: 100,
                            passingMarks: 35,
                          },
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add Subject
                    </Button>
                  </div>
                  {subjects.map((sub, idx) => (
                    <div key={sub.id} className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Subject"
                        value={sub.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSubjects((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, name: v } : s))
                          );
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={String(sub.maxMarks)}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 100;
                          setSubjects((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, maxMarks: v } : s))
                          );
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Pass"
                        value={String(sub.passingMarks)}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 35;
                          setSubjects((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, passingMarks: v } : s
                            )
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
                <Button type="submit" fullWidth loading={loading}>
                  Schedule Examination
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enter Subject-Wise Marks</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEnterMarks} className="space-y-3.5">
                <Select
                  label="Examination"
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  options={
                    exams.length > 0
                      ? exams.map((ex) => ({
                          label: `${ex.title} (${ex.batchName})`,
                          value: ex.id,
                        }))
                      : [{ label: "Create an exam first", value: "" }]
                  }
                />
                <Select
                  label="Student"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  options={
                    students.length > 0
                      ? students.map((s) => ({
                          label: `${s.fullName} (${s.studentCode})`,
                          value: s.id,
                        }))
                      : [{ label: "No students available", value: "" }]
                  }
                />
                {selectedExam && (
                  <div className="border-border bg-surface space-y-2 rounded-lg border p-3">
                    {selectedExam.subjects.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-foreground text-xs font-medium">
                          {sub.name} (Max {sub.maxMarks})
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max={sub.maxMarks}
                          className="w-24"
                          value={obtainedMap[sub.id] ?? ""}
                          onChange={(e) =>
                            setObtainedMap((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  disabled={!selectedExam || students.length === 0}
                >
                  Save Marks &amp; Compute Grade
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Examinations ({exams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <p className="text-muted text-sm">No examinations created yet.</p>
          ) : (
            <div className="space-y-2.5">
              {exams.map((ex) => (
                <div
                  key={ex.id}
                  className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5 text-sm"
                >
                  <div>
                    <p className="text-foreground font-semibold">{ex.title}</p>
                    <p className="text-muted text-xs">
                      {ex.batchName} &bull; {ex.examDate} &bull; {ex.subjects.length}{" "}
                      subjects
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ex.status === "published" ? "success" : "outline"}>
                      {ex.status}
                    </Badge>
                    {canWrite && ex.status !== "published" && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={loading}
                        onClick={() => handlePublish(ex.id)}
                      >
                        Publish Results
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evaluated Marksheets ({marksheets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {marksheets.length === 0 ? (
            <p className="text-muted text-sm">No marks entered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border text-muted border-b text-xs uppercase">
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Exam</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Grade</th>
                    <th className="py-2">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {marksheets.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-4 font-medium">
                        {m.studentName} ({m.studentCode})
                      </td>
                      <td className="text-muted py-2.5 pr-4">{m.examTitle}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">
                        {m.totalObtained}/{m.totalMax} ({m.percentage}%)
                      </td>
                      <td className="py-2.5 pr-4 font-semibold">{m.grade}</td>
                      <td className="py-2.5">
                        <Badge variant={m.result === "PASS" ? "success" : "danger"}>
                          {m.result}
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
