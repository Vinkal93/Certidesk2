"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Plus,
  Shuffle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import type { BatchRecord, CourseRecord } from "@/types/academic";
import type { OnlineExamRecord, QuestionBankRecord } from "@/types/online-exam";

function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

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

  // Build unique Course / Question Bank Tags from courses + question bank
  const activeQuestions = React.useMemo(
    () => questions.filter((q) => q.status === "active"),
    [questions]
  );

  const poolTags = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of courses) {
      map.set(c.name, 0);
    }
    for (const q of activeQuestions) {
      const tag = (q.courseName?.trim() || q.subject.trim() || "General").trim();
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
    // Recount accurately per course name or subject match
    const result: Array<{ tag: string; count: number }> = [];
    for (const tag of map.keys()) {
      const lower = tag.toLowerCase();
      const count = activeQuestions.filter((q) => {
        const c = (q.courseName ?? "").trim().toLowerCase();
        const s = q.subject.trim().toLowerCase();
        return c === lower || s === lower || c.includes(lower) || lower.includes(c);
      }).length;
      result.push({ tag, count });
    }
    return result.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [activeQuestions, courses]);

  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [courseId, setCourseId] = React.useState(courses[0]?.id ?? "");
  const [questionPoolTag, setQuestionPoolTag] = React.useState(
    courses[0]?.name ?? poolTags[0]?.tag ?? ""
  );
  const [batchId, setBatchId] = React.useState("__ALL__");
  const [questionCount, setQuestionCount] = React.useState("25");
  const [durationMinutes, setDurationMinutes] = React.useState("60");
  const [autoCalcMarks, setAutoCalcMarks] = React.useState(true);
  const [marksPerQuestion, setMarksPerQuestion] = React.useState("2");
  const [maxMarks, setMaxMarks] = React.useState("50");
  const [passingMarks, setPassingMarks] = React.useState("18");
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = React.useState(false);
  const [negativeMarkingPerQuestion, setNegativeMarkingPerQuestion] =
    React.useState("0.25");
  const [windowStartAt, setWindowStartAt] = React.useState(() =>
    toLocalDateTimeInput(new Date())
  );
  const [windowEndAt, setWindowEndAt] = React.useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  );
  const [instructions, setInstructions] = React.useState(
    "Read each question carefully. Questions and options are shuffled per student. Your answers are autosaved automatically."
  );

  const [loading, setLoading] = React.useState(false);
  const [busyExamId, setBusyExamId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Extend deadline modal
  const [extendTarget, setExtendTarget] = React.useState<OnlineExamRecord | null>(null);
  const [extendEndAt, setExtendEndAt] = React.useState("");
  const [extendDuration, setExtendDuration] = React.useState("");

  const courseBatches = React.useMemo(
    () => batches.filter((b) => !courseId || b.courseId === courseId),
    [batches, courseId]
  );

  const availableInSelectedPool = React.useMemo(() => {
    if (!questionPoolTag || questionPoolTag === "__ALL__") return activeQuestions.length;
    const lower = questionPoolTag.trim().toLowerCase();
    return activeQuestions.filter((q) => {
      const c = (q.courseName ?? "").trim().toLowerCase();
      const s = q.subject.trim().toLowerCase();
      return c === lower || s === lower || c.includes(lower) || lower.includes(c);
    }).length;
  }, [activeQuestions, questionPoolTag]);

  const syncAutoMarks = (
    nextQCount: string,
    nextPerQ: string,
    enabled = autoCalcMarks
  ) => {
    if (!enabled) return;
    const qCount = Math.max(0, Number(nextQCount) || 0);
    const perQ = Math.max(0.5, Number(nextPerQ) || 1);
    const computed = Math.round(qCount * perQ);
    setMaxMarks(String(computed));
    setPassingMarks(String(Math.ceil(computed * 0.35)));
  };

  const handleAutoCode = () => {
    const prefix = (
      questionPoolTag ||
      courses.find((c) => c.id === courseId)?.name ||
      "EXM"
    )
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    setCode(`EXM-${prefix || "CERT"}-${suffix}`);
  };

  const handleCourseChange = (nextCourseId: string) => {
    setCourseId(nextCourseId);
    const found = courses.find((c) => c.id === nextCourseId);
    if (found) {
      setQuestionPoolTag(found.name);
    }
    setBatchId("__ALL__");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const course = courses.find((c) => c.id === courseId);
      const targetBatchIds =
        batchId === "__ALL__" ? courseBatches.map((b) => b.id) : batchId ? [batchId] : [];

      if (targetBatchIds.length === 0) {
        setError("Select at least one target batch (or create a batch for this course).");
        setLoading(false);
        return;
      }

      const finalCode =
        code.trim() ||
        `EXM-${(questionPoolTag || "GEN")
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 5)
          .toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const res = await fetch("/api/institute/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          code: finalCode,
          courseId: courseId || "general",
          courseName: course?.name ?? questionPoolTag ?? "General",
          questionPoolTag: questionPoolTag || course?.name || "__ALL__",
          batchIds: targetBatchIds,
          questionCount: Number(questionCount),
          durationMinutes: Number(durationMinutes),
          maxMarks: Number(maxMarks),
          passingMarks: Number(passingMarks),
          negativeMarkingEnabled,
          negativeMarkingPerQuestion: negativeMarkingEnabled
            ? Number(negativeMarkingPerQuestion || 0)
            : 0,
          randomizeQuestions: true,
          randomizeOptions: true,
          allowStudentAnswerReview: true,
          windowStartAt: new Date(windowStartAt).toISOString(),
          windowEndAt: new Date(windowEndAt).toISOString(),
          instructions,
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
      setMessage(
        `Online exam "${json.data.exam.title}" created. Click "Publish Exam" to lock the ${json.data.exam.questionCount ?? questionCount} random questions and open it to students.`
      );
      router.refresh();
    } catch {
      setError("Network error while creating exam.");
    } finally {
      setLoading(false);
    }
  };

  const handleLifecycle = async (
    examId: string,
    action: "set_status" | "declare_results" | "hide_results",
    status?: string
  ) => {
    setBusyExamId(examId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/institute/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "set_status" ? { action: "set_status", status } : { action }
        ),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          exam?: OnlineExamRecord;
          declaredCount?: number;
          hiddenCount?: number;
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Action failed.");
        return;
      }
      if (json.data?.exam) {
        setExams((prev) => prev.map((e) => (e.id === examId ? json.data!.exam! : e)));
        setMessage(
          json.data.exam.status === "published"
            ? `Exam published! ${json.data.exam.questionIds.length} unique random questions locked for all students.`
            : `Exam status updated to ${json.data.exam.status}.`
        );
      } else if (action === "declare_results") {
        setExams((prev) =>
          prev.map((e) => (e.id === examId ? { ...e, status: "results_declared" } : e))
        );
        setMessage(`Declared results for ${json.data?.declaredCount ?? 0} attempt(s).`);
      } else if (action === "hide_results") {
        setExams((prev) =>
          prev.map((e) => (e.id === examId ? { ...e, status: "results_ready" } : e))
        );
        setMessage(`Results hidden from student portal.`);
      }
      router.refresh();
    } catch {
      setError("Network error while updating exam.");
    } finally {
      setBusyExamId(null);
    }
  };

  const handleExtendDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendTarget) return;
    setBusyExamId(extendTarget.id);
    setError(null);
    try {
      const res = await fetch(`/api/institute/exams/${extendTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_schedule",
          windowStartAt: extendTarget.windowStartAt,
          windowEndAt: new Date(extendEndAt).toISOString(),
          durationMinutes: Number(extendDuration),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { exam?: OnlineExamRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data?.exam) {
        setError(json.error?.message ?? "Failed to update schedule.");
        return;
      }
      setExams((prev) =>
        prev.map((ex) => (ex.id === extendTarget.id ? json.data!.exam! : ex))
      );
      setMessage(`Deadline extended for ${extendTarget.title}.`);
      setExtendTarget(null);
      router.refresh();
    } catch {
      setError("Network error while extending deadline.");
    } finally {
      setBusyExamId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" aria-hidden="true" />
            Create Smart Online Examination
          </CardTitle>
          <p className="text-muted text-xs">
            System automatically selects unique random questions from the selected
            course&apos;s question bank and shuffles sequence per student.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-900/40"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
          {message ? (
            <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs dark:border-emerald-900/40">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </div>
          ) : null}

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Exam Title *"
                required
                placeholder="e.g. CCC Final Mock Test"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="space-y-1">
                <div className="flex items-end gap-1.5">
                  <div className="flex-1">
                    <Input
                      label="Exam Code *"
                      required
                      placeholder="EXM-CCC-101"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoCode}
                    className="mb-0.5 shrink-0"
                  >
                    Auto
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Course *"
                value={courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                options={
                  courses.length === 0
                    ? [{ label: "Create course first", value: "" }]
                    : courses.map((c) => ({ label: c.name, value: c.id }))
                }
              />
              <Select
                label="Target Batch *"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                options={
                  courseBatches.length === 0
                    ? [{ label: "No batches for course", value: "" }]
                    : [
                        {
                          label: `All Course Batches (${courseBatches.length})`,
                          value: "__ALL__",
                        },
                        ...courseBatches.map((b) => ({ label: b.name, value: b.id })),
                      ]
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Question Bank Tag *"
                value={questionPoolTag}
                onChange={(e) => setQuestionPoolTag(e.target.value)}
                options={[
                  {
                    label: `All Active Questions (${activeQuestions.length})`,
                    value: "__ALL__",
                  },
                  ...poolTags.map((pt) => ({
                    label: `${pt.tag} (${pt.count} Qs)`,
                    value: pt.tag,
                  })),
                ]}
              />
              <Input
                label={`Number of Questions (Max ${availableInSelectedPool}) *`}
                type="number"
                min={1}
                max={Math.max(1, availableInSelectedPool)}
                required
                value={questionCount}
                onChange={(e) => {
                  setQuestionCount(e.target.value);
                  syncAutoMarks(e.target.value, marksPerQuestion);
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Duration (min)"
                type="number"
                min={5}
                max={360}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
              <Input
                label="Max Marks"
                type="number"
                min={1}
                required
                value={maxMarks}
                onChange={(e) => {
                  setAutoCalcMarks(false);
                  setMaxMarks(e.target.value);
                }}
              />
              <Input
                label="Passing Marks"
                type="number"
                min={0}
                required
                value={passingMarks}
                onChange={(e) => setPassingMarks(e.target.value)}
              />
            </div>

            <div className="border-border bg-surface/60 space-y-2 rounded-xl border p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={autoCalcMarks}
                    onChange={(e) => {
                      setAutoCalcMarks(e.target.checked);
                      syncAutoMarks(questionCount, marksPerQuestion, e.target.checked);
                    }}
                  />
                  Auto-calculate Max Marks
                </label>
                {autoCalcMarks ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted">Marks/Q:</span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={marksPerQuestion}
                      onChange={(e) => {
                        setMarksPerQuestion(e.target.value);
                        syncAutoMarks(questionCount, e.target.value);
                      }}
                      className="border-border bg-background w-16 rounded border px-2 py-1 text-xs"
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={negativeMarkingEnabled}
                    onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                  />
                  Enable Negative Marking
                </label>
                {negativeMarkingEnabled ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted">Deduct/Wrong:</span>
                    <input
                      type="number"
                      min={0}
                      step={0.25}
                      value={negativeMarkingPerQuestion}
                      onChange={(e) => setNegativeMarkingPerQuestion(e.target.value)}
                      className="border-border bg-background w-16 rounded border px-2 py-1 text-xs"
                    />
                  </div>
                ) : null}
              </div>

              <p className="text-muted flex items-center gap-1.5 pt-0.5 text-[11px]">
                <Shuffle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Questions &amp; options are automatically shuffled per student.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                label="Exam Start Date & Time *"
                type="datetime-local"
                required
                value={windowStartAt}
                onChange={(e) => setWindowStartAt(e.target.value)}
              />
              <Input
                label="Exam End Date & Time *"
                type="datetime-local"
                required
                value={windowEndAt}
                onChange={(e) => setWindowEndAt(e.target.value)}
              />
            </div>

            <Textarea
              label="Instructions"
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Exam instructions shown to students before starting..."
            />

            <Button
              type="submit"
              loading={loading}
              fullWidth
              disabled={
                !courseId || courseBatches.length === 0 || availableInSelectedPool === 0
              }
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
              exams.map((ex) => {
                const qTotal = ex.questionIds.length || ex.questionCount || 0;
                const isBusy = busyExamId === ex.id;
                return (
                  <div key={ex.id} className="space-y-2.5 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-foreground text-sm font-semibold">
                          {ex.title}{" "}
                          <span className="text-muted font-mono text-xs">
                            ({ex.code})
                          </span>
                        </p>
                        <p className="text-muted">
                          {ex.courseName} · {ex.durationMinutes} min · {qTotal} Qs · Max{" "}
                          {ex.maxMarks} marks (Pass {ex.passingMarks})
                        </p>
                        <p className="text-muted text-[11px]">
                          Window: {new Date(ex.windowStartAt).toLocaleString()} →{" "}
                          {new Date(ex.windowEndAt).toLocaleString()}
                        </p>
                      </div>
                      <StatusChip status={ex.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ex.status === "draft" ? (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={isBusy}
                          onClick={() =>
                            void handleLifecycle(ex.id, "set_status", "published")
                          }
                        >
                          Publish Exam
                        </Button>
                      ) : null}

                      {ex.status === "published" || ex.status === "results_ready" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={isBusy}
                          onClick={() => void handleLifecycle(ex.id, "declare_results")}
                        >
                          Declare Results
                        </Button>
                      ) : null}

                      {ex.status === "results_declared" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={isBusy}
                          onClick={() => void handleLifecycle(ex.id, "hide_results")}
                        >
                          Hide Results
                        </Button>
                      ) : null}

                      {ex.status !== "cancelled" && ex.status !== "archived" ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={
                              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                            }
                            onClick={() => {
                              setExtendTarget(ex);
                              setExtendEndAt(
                                toLocalDateTimeInput(new Date(ex.windowEndAt))
                              );
                              setExtendDuration(String(ex.durationMinutes));
                            }}
                          >
                            Extend Deadline
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:text-danger"
                            leftIcon={
                              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            }
                            onClick={() =>
                              void handleLifecycle(ex.id, "set_status", "cancelled")
                            }
                          >
                            Cancel
                          </Button>
                        </>
                      ) : null}

                      <Link
                        href={`/institute/exams/${ex.id}/results`}
                        className="text-primary ml-auto inline-flex items-center px-2 py-1 font-semibold hover:underline"
                      >
                        View Reports →
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <ResponsiveFormModal
        open={Boolean(extendTarget)}
        onClose={() => setExtendTarget(null)}
        title="Extend Examination Deadline"
        subtitle={extendTarget ? `${extendTarget.title} (${extendTarget.code})` : ""}
      >
        <form onSubmit={handleExtendDeadline} className="space-y-4">
          <Input
            label="New End Date & Time"
            type="datetime-local"
            required
            value={extendEndAt}
            onChange={(e) => setExtendEndAt(e.target.value)}
          />
          <Input
            label="Duration (minutes)"
            type="number"
            min={5}
            max={360}
            required
            value={extendDuration}
            onChange={(e) => setExtendDuration(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setExtendTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={busyExamId === extendTarget?.id}>
              Save Schedule
            </Button>
          </div>
        </form>
      </ResponsiveFormModal>
    </div>
  );
}
