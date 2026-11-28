"use client";

import * as React from "react";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import type { ExamQuestionAnalysisItem, ExamResultRecord } from "@/types/online-exam";

export function StudentOnlineResultsClient({
  declaredResults,
}: {
  declaredResults: ExamResultRecord[];
}) {
  const [activeResult, setActiveResult] = React.useState<ExamResultRecord | null>(null);
  const [analysis, setAnalysis] = React.useState<ExamQuestionAnalysisItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const openAnalysis = async (r: ExamResultRecord) => {
    setActiveResult(r);
    setAnalysis([]);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/student/exams/${r.examId}/analysis?attemptId=${encodeURIComponent(r.attemptId)}`
      );
      const json = (await res.json()) as {
        ok: boolean;
        data?: { analysis?: ExamQuestionAnalysisItem[] };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data?.analysis) {
        setError(json.error?.message ?? "Answer review is not available.");
        return;
      }
      setAnalysis(json.data.analysis);
    } catch {
      setError("Network error while loading answer analysis.");
    } finally {
      setLoading(false);
    }
  };

  if (declaredResults.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-foreground text-base font-bold">Online Examination Results</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {declaredResults.map((r) => (
          <Card key={r.id}>
            <CardHeader className="border-border flex flex-row items-start justify-between gap-2 border-b pb-3">
              <div>
                <CardTitle className="text-base">{r.examTitle}</CardTitle>
                <p className="text-muted text-xs">{r.courseName}</p>
              </div>
              <Badge variant={r.passed ? "success" : "danger"}>
                {r.passed ? "PASS" : "FAIL"} · {r.percentage}% ({r.grade})
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="border-border bg-surface rounded-lg border p-2">
                  <p className="text-muted text-[10px]">Marks</p>
                  <p className="text-foreground font-bold tabular-nums">
                    {r.obtainedMarks}/{r.maxMarks}
                  </p>
                </div>
                <div className="border-border bg-surface rounded-lg border p-2">
                  <p className="text-muted text-[10px]">Correct</p>
                  <p className="text-success font-bold tabular-nums">{r.correctCount}</p>
                </div>
                <div className="border-border bg-surface rounded-lg border p-2">
                  <p className="text-muted text-[10px]">Wrong</p>
                  <p className="text-danger font-bold tabular-nums">{r.incorrectCount}</p>
                </div>
                <div className="border-border bg-surface rounded-lg border p-2">
                  <p className="text-muted text-[10px]">Skipped</p>
                  <p className="text-foreground font-bold tabular-nums">
                    {r.unansweredCount}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => void openAnalysis(r)}
                >
                  View Answer Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ResponsiveFormModal
        open={Boolean(activeResult)}
        onClose={() => setActiveResult(null)}
        title={activeResult ? `${activeResult.examTitle} — Answer Analysis` : "Analysis"}
        subtitle={
          activeResult
            ? `Marks: ${activeResult.obtainedMarks}/${activeResult.maxMarks} (${activeResult.percentage}%)`
            : ""
        }
      >
        {loading ? (
          <p className="text-muted py-6 text-center text-xs">
            Loading question-wise analysis...
          </p>
        ) : error ? (
          <p className="text-danger py-6 text-center text-xs">{error}</p>
        ) : (
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1 text-xs">
            {analysis.map((item, idx) => (
              <div
                key={item.questionId}
                className="border-border bg-surface/50 space-y-2 rounded-xl border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-foreground font-semibold">
                    Q{idx + 1}. {item.questionText}
                  </p>
                  <Badge
                    variant={
                      !item.isAttempted
                        ? "outline"
                        : item.isCorrect
                          ? "success"
                          : "danger"
                    }
                  >
                    {!item.isAttempted
                      ? "Skipped"
                      : item.isCorrect
                        ? `+${item.marksAwarded}`
                        : `${item.marksAwarded}`}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {item.options.map((opt) => {
                    const isSelected = item.selectedOptionIds.includes(opt.id);
                    const isCorrect = item.correctOptionIds.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                          isCorrect
                            ? "border-emerald-400 bg-emerald-50/70 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : isSelected
                              ? "border-red-400 bg-red-50/70 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
                              : "border-border bg-background text-muted"
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />
                        ) : isSelected ? (
                          <XCircle
                            className="h-3.5 w-3.5 shrink-0 text-red-600"
                            aria-hidden="true"
                          />
                        ) : null}
                        <span>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
                {item.explanation ? (
                  <p className="text-muted bg-background rounded-lg p-2 text-[11px]">
                    <span className="text-foreground font-semibold">Explanation:</span>{" "}
                    {item.explanation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ResponsiveFormModal>
    </div>
  );
}
