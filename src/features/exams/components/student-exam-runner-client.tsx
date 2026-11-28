"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import type { ExamAttemptRecord } from "@/types/online-exam";

export function StudentExamRunnerClient({ attempt }: { attempt: ExamAttemptRecord }) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string[]>>(
    attempt.answers ?? {}
  );
  const [marked, setMarked] = React.useState<string[]>(attempt.markedForReview ?? []);
  const [remainingSeconds, setRemainingSeconds] = React.useState(() =>
    Math.max(0, Math.floor((Date.parse(attempt.deadlineAt) - Date.now()) / 1000))
  );
  const [saving, setSaving] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(attempt.status !== "in_progress");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

  const questions = attempt.questionSnapshot;
  const activeQ = questions[currentIdx];
  const answeredCount = React.useMemo(
    () => questions.filter((q) => (answers[q.questionId] ?? []).length > 0).length,
    [answers, questions]
  );
  const unansweredCount = questions.length - answeredCount;

  const persist = React.useCallback(
    async (action: "autosave" | "submit", nextAnswers = answers, nextMarked = marked) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/student/exams/attempts/${attempt.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            answers: nextAnswers,
            markedForReview: nextMarked,
          }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          data?: { autoSubmitted?: boolean; savedAt?: string };
          error?: { message?: string };
        };
        if (!res.ok || !json.ok) {
          setError(json.error?.message ?? "Save failed.");
          return;
        }
        if (action === "submit" || json.data?.autoSubmitted) {
          setSubmitted(true);
          setStatusMsg("Examination submitted and evaluated.");
          router.refresh();
        } else {
          setStatusMsg("Saved");
        }
      } catch {
        setError("Network error while saving answer.");
      } finally {
        setSaving(false);
      }
    },
    [answers, attempt.id, marked, router]
  );

  React.useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => {
      const secs = Math.max(
        0,
        Math.floor((Date.parse(attempt.deadlineAt) - Date.now()) / 1000)
      );
      setRemainingSeconds(secs);
      if (secs === 0) {
        void persist("submit");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt.deadlineAt, persist, submitted]);

  if (submitted) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <CheckCircle2 className="text-success mx-auto h-10 w-10" aria-hidden="true" />
          <h2 className="text-foreground text-xl font-bold">Examination Submitted</h2>
          <p className="text-muted text-sm">
            {statusMsg ??
              "Your answers have been recorded. Results will appear in Student Results once declared by your institute."}
          </p>
          <Button onClick={() => router.push("/student/exams")}>Back to My Exams</Button>
        </CardContent>
      </Card>
    );
  }

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>{attempt.examTitle}</CardTitle>
            <p className="text-muted text-xs">
              Question {currentIdx + 1} of {questions.length}
            </p>
          </div>
          <Badge variant={remainingSeconds < 120 ? "danger" : "primary"}>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? (
            <div
              role="alert"
              className="bg-danger-soft text-danger flex items-center gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          {activeQ ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-foreground text-base font-medium">
                  {activeQ.questionText}
                </p>
                <Badge variant="outline">{activeQ.marks} marks</Badge>
              </div>

              <div className="space-y-2.5">
                {activeQ.options.map((opt, optIdx) => {
                  const selected = (answers[activeQ.questionId] ?? []).includes(opt.id);
                  const displayLabel = String.fromCharCode(65 + optIdx);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const nextAns = {
                          ...answers,
                          [activeQ.questionId]: [opt.id],
                        };
                        setAnswers(nextAns);
                        void persist("autosave", nextAns, marked);
                      }}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary-soft text-foreground font-medium"
                          : "border-border bg-background hover:bg-surface text-foreground"
                      }`}
                    >
                      <span className="border-border inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                        {displayLabel}
                      </span>
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx >= questions.length - 1}
                onClick={() =>
                  setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                }
              >
                Next
              </Button>
              {activeQ ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Flag className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => {
                      const nextMarked = marked.includes(activeQ.questionId)
                        ? marked.filter((id) => id !== activeQ.questionId)
                        : [...marked, activeQ.questionId];
                      setMarked(nextMarked);
                      void persist("autosave", answers, nextMarked);
                    }}
                  >
                    {marked.includes(activeQ.questionId) ? "Unmark" : "Mark Review"}
                  </Button>
                  {(answers[activeQ.questionId] ?? []).length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const nextAns = { ...answers };
                        delete nextAns[activeQ.questionId];
                        setAnswers(nextAns);
                        void persist("autosave", nextAns, marked);
                      }}
                    >
                      Clear
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              {statusMsg ? (
                <span className="text-muted text-xs">
                  {saving ? "Saving..." : statusMsg}
                </span>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                loading={saving}
                onClick={() => setConfirmOpen(true)}
              >
                Submit Exam
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm">Question Palette</CardTitle>
          <p className="text-muted text-[11px]">
            Answered: {answeredCount} · Unanswered: {unansweredCount} · Marked:{" "}
            {marked.length}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = (answers[q.questionId] ?? []).length > 0;
              const isMarked = marked.includes(q.questionId);
              return (
                <button
                  key={q.questionId}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-9 cursor-pointer rounded-lg border text-xs font-semibold transition-colors ${
                    idx === currentIdx
                      ? "border-primary bg-primary text-white"
                      : isMarked
                        ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                        : isAnswered
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                          : "border-border bg-surface text-foreground"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="text-muted flex flex-wrap gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <span className="bg-primary inline-block h-2.5 w-2.5 rounded-sm" />
              Current
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-emerald-400 bg-emerald-100 dark:bg-emerald-900" />
              Answered
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-amber-400 bg-amber-100 dark:bg-amber-900" />
              Review
            </span>
          </div>
        </CardContent>
      </Card>

      <ResponsiveFormModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Final Submission"
        subtitle="You cannot modify your answers once submitted."
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="border-border bg-surface rounded-xl border p-3">
              <p className="text-muted">Answered</p>
              <p className="text-success mt-1 text-lg font-bold">{answeredCount}</p>
            </div>
            <div className="border-border bg-surface rounded-xl border p-3">
              <p className="text-muted">Unanswered</p>
              <p className="text-danger mt-1 text-lg font-bold">{unansweredCount}</p>
            </div>
            <div className="border-border bg-surface rounded-xl border p-3">
              <p className="text-muted">Marked</p>
              <p className="text-foreground mt-1 text-lg font-bold">{marked.length}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Continue Exam
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={saving}
              onClick={() => {
                setConfirmOpen(false);
                void persist("submit");
              }}
            >
              Confirm &amp; Submit
            </Button>
          </div>
        </div>
      </ResponsiveFormModal>
    </div>
  );
}
