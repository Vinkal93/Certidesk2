"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Award,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Printer,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Badge, StatusChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import type {
  ExamAttemptRecord,
  ExamQuestionAnalysisItem,
  ExamResultRecord,
  OnlineExamAnalyticsSummary,
  OnlineExamRecord,
} from "@/types/online-exam";

function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function ExamResultsClient({
  exam: initialExam,
  attempts,
  results: initialResults,
  analytics,
  batchNames,
}: {
  exam: OnlineExamRecord;
  attempts: ExamAttemptRecord[];
  results: ExamResultRecord[];
  analytics: OnlineExamAnalyticsSummary;
  batchNames: Record<string, string>;
}) {
  const router = useRouter();
  const [exam, setExam] = React.useState(initialExam);
  const [results, setResults] = React.useState(initialResults);
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Student Question-wise Analysis modal
  const [selectedResult, setSelectedResult] = React.useState<ExamResultRecord | null>(
    null
  );
  const [analysisItems, setAnalysisItems] = React.useState<ExamQuestionAnalysisItem[]>(
    []
  );
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);

  const openStudentAnalysis = async (resRow: ExamResultRecord) => {
    setSelectedResult(resRow);
    setAnalysisItems([]);
    setLoadingAnalysis(true);
    try {
      const resp = await fetch(
        `/api/institute/exams/${exam.id}?attemptId=${encodeURIComponent(resRow.attemptId)}`
      );
      const json = (await resp.json()) as {
        ok: boolean;
        data?: { analysis?: ExamQuestionAnalysisItem[] };
      };
      if (resp.ok && json.ok && json.data?.analysis) {
        setAnalysisItems(json.data.analysis);
      }
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleToggleDeclare = async () => {
    const action =
      exam.status === "results_declared" ? "hide_results" : "declare_results";
    setBusyAction(action);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/institute/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to update result visibility.");
        return;
      }
      const nextDeclared = action === "declare_results";
      setExam((prev) => ({
        ...prev,
        status: nextDeclared ? "results_declared" : "results_ready",
      }));
      setResults((prev) => prev.map((r) => ({ ...r, declared: nextDeclared })));
      setMessage(
        nextDeclared
          ? "Results published! Students can now view their scores and answer analysis."
          : "Results hidden from the Student Portal."
      );
      router.refresh();
    } finally {
      setBusyAction(null);
    }
  };

  const handleReevaluate = async () => {
    setBusyAction("reevaluate");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/institute/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reevaluate_results",
          reason: "Re-evaluated from exam reports dashboard",
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { reevaluatedCount: number; updatedCount: number };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Re-evaluation failed.");
        return;
      }
      setMessage(
        `Re-evaluated ${json.data?.reevaluatedCount ?? 0} submission(s). ${
          json.data?.updatedCount ?? 0
        } score(s) updated with audit log.`
      );
      router.refresh();
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportExcel = () => {
    const rows = results.map((r) => ({
      Rank: r.rank ?? "",
      "Student ID": r.studentCode,
      "Student Name": r.studentName,
      Course: r.courseName,
      Batch: batchNames[r.batchId] ?? r.batchId,
      "Total Questions": r.correctCount + r.incorrectCount + r.unansweredCount,
      Attempted: r.attemptedCount ?? r.correctCount + r.incorrectCount,
      Correct: r.correctCount,
      Wrong: r.incorrectCount,
      Unanswered: r.unansweredCount,
      "Obtained Marks": r.obtainedMarks,
      "Max Marks": r.maxMarks,
      "Percentage (%)": r.percentage,
      Grade: r.grade,
      Result: r.passed ? "PASS" : "FAIL",
      "Time Taken": formatDuration(r.timeTakenSeconds),
      "Submitted At": r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam Results");
    XLSX.writeFile(wb, `${exam.code || "EXAM"}-results.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-2xl font-bold tracking-tight">
            {exam.title} — Examination Reports
          </h2>
          <p className="text-muted text-xs">
            {exam.code} · {exam.courseName} · {exam.questionIds.length} Questions · Max{" "}
            {exam.maxMarks} Marks (Pass {exam.passingMarks}) · Status:{" "}
            <span className="font-semibold uppercase">
              {exam.status.replace(/_/g, " ")}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={handleExportExcel}
            disabled={results.length === 0}
          >
            Export Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Printer className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => window.print()}
          >
            Print / PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={busyAction === "reevaluate"}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => void handleReevaluate()}
            disabled={results.length === 0}
          >
            Re-evaluate
          </Button>
          <Button
            size="sm"
            variant={exam.status === "results_declared" ? "outline" : "primary"}
            loading={busyAction === "declare_results" || busyAction === "hide_results"}
            leftIcon={
              exam.status === "results_declared" ? (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              )
            }
            onClick={() => void handleToggleDeclare()}
          >
            {exam.status === "results_declared" ? "Hide Results" : "Publish Results"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="bg-danger-soft text-danger rounded-xl border border-red-200 p-3 text-xs">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="bg-success-soft text-success rounded-xl border border-emerald-200 p-3 text-xs">
          {message}
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px] font-medium">Submitted</p>
            <p className="text-foreground mt-1 text-xl font-bold tabular-nums">
              {analytics.submittedAttempts}
            </p>
            <p className="text-muted text-[11px]">
              {analytics.inProgressAttempts} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px] font-medium">Pass Rate</p>
            <p className="text-success mt-1 text-xl font-bold tabular-nums">
              {analytics.passPercentage}%
            </p>
            <p className="text-muted text-[11px]">
              {results.filter((r) => r.passed).length} passed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px] font-medium">Highest Marks</p>
            <p className="text-foreground mt-1 text-xl font-bold tabular-nums">
              {analytics.highestMarks}
            </p>
            <p className="text-muted text-[11px]">out of {exam.maxMarks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px] font-medium">Average Marks</p>
            <p className="text-primary mt-1 text-xl font-bold tabular-nums">
              {analytics.averageMarks}
            </p>
            <p className="text-muted text-[11px]">class mean</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px] font-medium">Lowest Marks</p>
            <p className="text-foreground mt-1 text-xl font-bold tabular-nums">
              {analytics.lowestMarks}
            </p>
            <p className="text-muted text-[11px]">minimum scored</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-[11px] font-medium">Total Attempts</p>
            <p className="text-foreground mt-1 text-xl font-bold tabular-nums">
              {attempts.length}
            </p>
            <p className="text-muted text-[11px]">recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch-wise Comparison */}
      {analytics.batchComparison.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Batch-wise Result Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border bg-surface text-muted border-b">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Batch</th>
                    <th className="px-3 py-2 font-semibold">Submitted</th>
                    <th className="px-3 py-2 font-semibold">Passed</th>
                    <th className="px-3 py-2 font-semibold">Pass %</th>
                    <th className="px-3 py-2 font-semibold">Highest</th>
                    <th className="px-3 py-2 font-semibold">Average</th>
                    <th className="px-3 py-2 font-semibold">Lowest</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {analytics.batchComparison.map((b) => (
                    <tr key={b.batchId}>
                      <td className="px-3 py-2 font-semibold">{b.batchName}</td>
                      <td className="px-3 py-2 tabular-nums">{b.submittedCount}</td>
                      <td className="px-3 py-2 tabular-nums">{b.passedCount}</td>
                      <td className="px-3 py-2 font-semibold tabular-nums">
                        {b.passPercentage}%
                      </td>
                      <td className="px-3 py-2 tabular-nums">{b.highestMarks}</td>
                      <td className="px-3 py-2 tabular-nums">{b.averageMarks}</td>
                      <td className="px-3 py-2 tabular-nums">{b.lowestMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Merit List & Student-wise Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="text-primary h-4 w-4" aria-hidden="true" />
            Merit List &amp; Student-wise Reports ({results.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-border bg-surface text-muted border-b">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Rank</th>
                  <th className="px-3 py-2.5 font-semibold">Student</th>
                  <th className="px-3 py-2.5 font-semibold">Course / Batch</th>
                  <th className="px-3 py-2.5 font-semibold">Q / Att / C / W / U</th>
                  <th className="px-3 py-2.5 font-semibold">Marks</th>
                  <th className="px-3 py-2.5 font-semibold">%</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Time Taken</th>
                  <th className="px-3 py-2.5 font-semibold">Submitted</th>
                  <th className="px-3 py-2.5 text-right font-semibold print:hidden">
                    Analysis
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-muted px-3 py-8 text-center">
                      No evaluated submissions yet.
                    </td>
                  </tr>
                ) : (
                  results.map((r) => {
                    const totalQ = r.correctCount + r.incorrectCount + r.unansweredCount;
                    const attempted =
                      r.attemptedCount ?? r.correctCount + r.incorrectCount;
                    return (
                      <tr key={r.id} className="hover:bg-surface/60">
                        <td className="px-3 py-2.5 font-bold tabular-nums">
                          #{r.rank ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-foreground font-semibold">{r.studentName}</p>
                          <p className="text-muted font-mono text-[11px]">
                            {r.studentCode}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <p>{r.courseName}</p>
                          <p className="text-muted text-[11px]">
                            {batchNames[r.batchId] ?? r.batchId}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums">
                          {totalQ} / {attempted} /{" "}
                          <span className="text-success font-semibold">
                            {r.correctCount}
                          </span>{" "}
                          /{" "}
                          <span className="text-danger font-semibold">
                            {r.incorrectCount}
                          </span>{" "}
                          / {r.unansweredCount}
                        </td>
                        <td className="px-3 py-2.5 font-semibold tabular-nums">
                          {r.obtainedMarks} / {r.maxMarks}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{r.percentage}%</td>
                        <td className="px-3 py-2.5">
                          <StatusChip status={r.passed ? "PASS" : "FAIL"} />
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {formatDuration(r.timeTakenSeconds)}
                        </td>
                        <td className="text-muted px-3 py-2.5 text-[11px]">
                          {r.submittedAt
                            ? new Date(r.submittedAt).toLocaleString()
                            : new Date(r.evaluatedAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right print:hidden">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            }
                            onClick={() => void openStudentAnalysis(r)}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ResponsiveFormModal
        open={Boolean(selectedResult)}
        onClose={() => setSelectedResult(null)}
        title={
          selectedResult
            ? `${selectedResult.studentName} (${selectedResult.studentCode})`
            : "Answer Analysis"
        }
        subtitle={
          selectedResult
            ? `Score: ${selectedResult.obtainedMarks}/${selectedResult.maxMarks} (${selectedResult.percentage}%) · Correct: ${selectedResult.correctCount} · Wrong: ${selectedResult.incorrectCount}`
            : ""
        }
      >
        {loadingAnalysis ? (
          <p className="text-muted py-8 text-center text-xs">
            Loading question-wise answer analysis...
          </p>
        ) : analysisItems.length === 0 ? (
          <p className="text-muted py-6 text-center text-xs">
            No question breakdown available for this attempt.
          </p>
        ) : (
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1 text-xs">
            {analysisItems.map((item, idx) => (
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
                      ? "Unanswered (0)"
                      : item.isCorrect
                        ? `Correct (+${item.marksAwarded})`
                        : `Wrong (${item.marksAwarded})`}
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
