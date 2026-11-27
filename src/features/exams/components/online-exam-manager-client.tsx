"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BatchRecord, CourseRecord } from "@/types/academic";
import type { OnlineExamRecord, QuestionBankRecord } from "@/types/online-exam";

export function OnlineExamManagerClient({
  initialExams,
  courses,
  batches,
  questions,
}: {
  initialExams: OnlineExamRecord[];
  courses: CourseRecord[];
  batches: BatchRecord[];
  questions: QuestionBankRecord[];
}) {
  const router = useRouter();
  const [exams, setExams] = React.useState(initialExams);
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [courseId, setCourseId] = React.useState(courses[0]?.id ?? "");
  const [batchId, setBatchId] = React.useState(batches[0]?.id ?? "");
  const [durationMinutes, setDurationMinutes] = React.useState("45");
  const [maxMarks, setMaxMarks] = React.useState("20");
  const [passingMarks, setPassingMarks] = React.useState("7");
  const [windowStartAt, setWindowStartAt] = React.useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [windowEndAt, setWindowEndAt] = React.useState(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [selectedQuestionIds, setSelectedQuestionIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const courseBatches = batches.filter((b) => !courseId || b.courseId === courseId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const course = courses.find((c) => c.id === courseId);
      const res = await fetch("/api/institute/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          code,
          courseId,
          courseName: course?.name ?? "General",
          batchIds: batchId ? [batchId] : [],
          durationMinutes: Number(durationMinutes),
          maxMarks: Number(maxMarks),
          passingMarks: Number(passingMarks),
          windowStartAt: new Date(windowStartAt).toISOString(),
          windowEndAt: new Date(windowEndAt).toISOString(),
          questionIds: selectedQuestionIds,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { exam: OnlineExamRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create online exam.");
        return;
      }
      setExams((prev) => [json.data!.exam, ...prev]);
      setTitle("");
      setCode("");
      setMessage("Online exam created as draft. Publish when ready for students.");
      router.refresh();
    } catch {
      setError("Network error while creating exam.");
    } finally {
      setLoading(false);
    }
  };

  const handleLifecycle = async (
    examId: string,
    action: "set_status" | "declare_results",
    status?: string
  ) => {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/institute/exams/${examId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "declare_results"
          ? { action: "declare_results" }
          : { action: "set_status", status }
      ),
    });
    const json = (await res.json()) as {
      ok: boolean;
      data?: { exam?: OnlineExamRecord; declaredCount?: number };
      error?: { message?: string };
    };
    if (!res.ok || !json.ok) {
      setError(json.error?.message ?? "Action failed.");
      return;
    }
    if (json.data?.exam) {
      setExams((prev) => prev.map((e) => (e.id === examId ? json.data!.exam! : e)));
      setMessage(`Exam status updated to ${json.data.exam.status}.`);
    } else {
      setMessage(`Declared results for ${json.data?.declaredCount ?? 0} attempt(s).`);
    }
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Create Online Examination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
          {message ? (
            <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </div>
          ) : null}

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Exam Title *"
                required
                placeholder="e.g. Tally Mid-Term MCQ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                label="Exam Code *"
                required
                placeholder="EXM-TALLY-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                options={
                  courses.length === 0
                    ? [{ label: "Create course first", value: "" }]
                    : courses.map((c) => ({ label: c.name, value: c.id }))
                }
              />
              <Select
                label="Batch"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                options={
                  courseBatches.length === 0
                    ? [{ label: "Create batch first", value: "" }]
                    : courseBatches.map((b) => ({ label: b.name, value: b.id }))
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Duration (min)"
                type="number"
                min={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
              <Input
                label="Max Marks"
                type="number"
                min={1}
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
              />
              <Input
                label="Passing"
                type="number"
                min={0}
                value={passingMarks}
                onChange={(e) => setPassingMarks(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Window Start"
                type="datetime-local"
                value={windowStartAt}
                onChange={(e) => setWindowStartAt(e.target.value)}
              />
              <Input
                label="Window End"
                type="datetime-local"
                value={windowEndAt}
                onChange={(e) => setWindowEndAt(e.target.value)}
              />
            </div>

            <div>
              <p className="text-foreground mb-1.5 text-xs font-semibold">
                Select Questions ({selectedQuestionIds.length} selected)
              </p>
              <div className="border-border max-h-36 space-y-1.5 overflow-y-auto rounded-lg border p-2.5 text-xs">
                {questions.length === 0 ? (
                  <p className="text-muted">No questions in Question Bank yet.</p>
                ) : (
                  questions.map((q) => {
                    const checked = selectedQuestionIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedQuestionIds((prev) =>
                              e.target.checked
                                ? [...prev, q.id]
                                : prev.filter((id) => id !== q.id)
                            );
                          }}
                        />
                        <span className="truncate">
                          [{q.marks}m] {q.questionText}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              fullWidth
              disabled={!courseId || !batchId}
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Create Online Exam
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle>Online Examinations ({exams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-border divide-y text-xs">
            {exams.length === 0 ? (
              <p className="text-muted py-6 text-center">No online exams created yet.</p>
            ) : (
              exams.map((ex) => (
                <div key={ex.id} className="space-y-2 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        {ex.title} ({ex.code})
                      </p>
                      <p className="text-muted">
                        {ex.courseName} · {ex.durationMinutes} min ·{" "}
                        {ex.questionIds.length} Qs · Max {ex.maxMarks} marks
                      </p>
                    </div>
                    <Badge
                      variant={
                        ex.status === "published" || ex.status === "results_declared"
                          ? "success"
                          : "outline"
                      }
                    >
                      {ex.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ex.status === "draft" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void handleLifecycle(ex.id, "set_status", "published")
                        }
                      >
                        Publish Exam
                      </Button>
                    ) : null}
                    {ex.status === "published" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleLifecycle(ex.id, "declare_results")}
                      >
                        Declare Results
                      </Button>
                    ) : null}
                    <Link
                      href={`/institute/exams/${ex.id}/results`}
                      className="text-primary inline-flex items-center px-2 py-1 font-medium hover:underline"
                    >
                      View Results →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
