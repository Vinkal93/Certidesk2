"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileFab, ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import type {
  QuestionBankRecord,
  QuestionDifficulty,
  QuestionType,
} from "@/types/online-exam";

interface ParsedImportRow {
  rowNumber: number;
  valid: boolean;
  error?: string;
  questionText: string;
  questionType: QuestionType;
  subject: string;
  topic: string;
  courseName?: string;
  difficulty: QuestionDifficulty;
  options: Array<{ id: string; text: string }>;
  correctOptionIds: string[];
  correctText?: string;
  marks: number;
  negativeMarks: number;
  explanation: string;
  language?: string;
}

const TEMPLATE_HEADERS = [
  "Question",
  "Type",
  "Subject",
  "Topic",
  "Course",
  "Difficulty",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Answer",
  "Marks",
  "Negative Marks",
  "Explanation",
  "Language",
];

function normalizeType(raw: string): QuestionType | null {
  const v = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!v || v === "single_mcq" || v === "mcq" || v === "single") return "single_mcq";
  if (v === "multi_mcq" || v === "multiple" || v === "multiple_correct") {
    return "multi_mcq";
  }
  if (v === "true_false" || v === "tf" || v === "boolean") return "true_false";
  if (v === "fill_blank" || v === "fill_in_the_blanks" || v === "fill_blanks") {
    return "fill_blank";
  }
  if (v === "short_answer" || v === "short") return "short_answer";
  return null;
}

export function QuestionBankClient({
  initialQuestions,
}: {
  initialQuestions: QuestionBankRecord[];
}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [questions, setQuestions] = React.useState(initialQuestions);
  const [filterSubject, setFilterSubject] = React.useState("");
  const [filterCourse, setFilterCourse] = React.useState("");
  const [showDeleted, setShowDeleted] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Add/Edit modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingQuestion, setEditingQuestion] = React.useState<QuestionBankRecord | null>(
    null
  );
  const [questionText, setQuestionText] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [questionType, setQuestionType] = React.useState<QuestionType>("single_mcq");
  const [subject, setSubject] = React.useState("");
  const [topic, setTopic] = React.useState("General");
  const [courseName, setCourseName] = React.useState("");
  const [language, setLanguage] = React.useState("English");
  const [difficulty, setDifficulty] = React.useState<QuestionDifficulty>("medium");
  const [optA, setOptA] = React.useState("");
  const [optB, setOptB] = React.useState("");
  const [optC, setOptC] = React.useState("");
  const [optD, setOptD] = React.useState("");
  const [correctKeys, setCorrectKeys] = React.useState<string[]>(["A"]);
  const [correctText, setCorrectText] = React.useState("");
  const [marks, setMarks] = React.useState("2");
  const [negativeMarks, setNegativeMarks] = React.useState("0");
  const [explanation, setExplanation] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Import preview modal
  const [importRows, setImportRows] = React.useState<ParsedImportRow[] | null>(null);
  const [importing, setImporting] = React.useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = React.useState<QuestionBankRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const resetForm = () => {
    setEditingQuestion(null);
    setQuestionText("");
    setImageUrl("");
    setQuestionType("single_mcq");
    setSubject("");
    setTopic("General");
    setCourseName("");
    setLanguage("English");
    setDifficulty("medium");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setCorrectKeys(["A"]);
    setCorrectText("");
    setMarks("2");
    setNegativeMarks("0");
    setExplanation("");
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (q: QuestionBankRecord) => {
    setEditingQuestion(q);
    setQuestionText(q.questionText);
    setImageUrl(q.imageUrl ?? "");
    setQuestionType(q.questionType);
    setSubject(q.subject);
    setTopic(q.topic || "General");
    setCourseName(q.courseName ?? "");
    setLanguage(q.language ?? "English");
    setDifficulty(q.difficulty);
    setOptA(q.options.find((o) => o.id === "A")?.text ?? "");
    setOptB(q.options.find((o) => o.id === "B")?.text ?? "");
    setOptC(q.options.find((o) => o.id === "C")?.text ?? "");
    setOptD(q.options.find((o) => o.id === "D")?.text ?? "");
    setCorrectKeys(q.correctOptionIds.length > 0 ? q.correctOptionIds : ["A"]);
    setCorrectText(q.correctText ?? "");
    setMarks(String(q.marks));
    setNegativeMarks(String(q.negativeMarks ?? 0));
    setExplanation(q.explanation ?? "");
    setError(null);
    setModalOpen(true);
  };

  const saveQuestion = async (addAnother: boolean) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const isText = questionType === "fill_blank" || questionType === "short_answer";
      const options =
        questionType === "true_false"
          ? [
              { id: "A", text: optA.trim() || "True" },
              { id: "B", text: optB.trim() || "False" },
            ]
          : isText
            ? []
            : [
                ...(optA.trim() ? [{ id: "A", text: optA.trim() }] : []),
                ...(optB.trim() ? [{ id: "B", text: optB.trim() }] : []),
                ...(optC.trim() ? [{ id: "C", text: optC.trim() }] : []),
                ...(optD.trim() ? [{ id: "D", text: optD.trim() }] : []),
              ];

      const payload = {
        questionText,
        imageUrl: imageUrl.trim() || undefined,
        questionType,
        subject,
        topic,
        courseName: courseName.trim() || undefined,
        language: language.trim() || "English",
        difficulty,
        options,
        correctOptionIds: isText ? [] : correctKeys,
        correctText: isText ? correctText : undefined,
        marks: Number(marks),
        negativeMarks: Number(negativeMarks || 0),
        explanation: explanation.trim() || undefined,
      };

      const url = editingQuestion
        ? `/api/institute/question-bank/${editingQuestion.id}`
        : "/api/institute/question-bank";
      const method = editingQuestion ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { question: QuestionBankRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to save question.");
        return;
      }

      if (editingQuestion) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? json.data!.question : q))
        );
        setModalOpen(false);
        setMessage("Question updated.");
      } else {
        setQuestions((prev) => [json.data!.question, ...prev]);
        setMessage("Question added to bank.");
        if (addAnother) resetForm();
        else setModalOpen(false);
      }
      router.refresh();
    } catch {
      setError("Network error while saving question.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (format: "xlsx" | "csv") => {
    const sampleRows = [
      [
        "Which key is used to save a document in MS Word?",
        "single_mcq",
        "MS Office",
        "MS Word Shortcuts",
        "ADCA",
        "easy",
        "Ctrl + S",
        "Ctrl + P",
        "Ctrl + C",
        "Ctrl + V",
        "A",
        2,
        0,
        "Ctrl + S saves the active document.",
        "English",
      ],
      [
        "RAM is volatile memory.",
        "true_false",
        "Computer Fundamentals",
        "Memory",
        "CCC",
        "easy",
        "True",
        "False",
        "",
        "",
        "A",
        1,
        0,
        "RAM loses data when power is turned off.",
        "English",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    if (format === "xlsx") {
      XLSX.writeFile(wb, "certidesk-question-template.xlsx");
    } else {
      XLSX.writeFile(wb, "certidesk-question-template.csv", { bookType: "csv" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      setError("Uploaded file contains no sheets.");
      return;
    }
    const ws = wb.Sheets[firstSheetName];
    if (!ws) return;

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: "",
    });
    if (rawRows.length === 0) {
      setError("Uploaded spreadsheet is empty.");
      return;
    }

    const existingTexts = new Set(
      questions
        .filter((q) => q.status !== "deleted")
        .map((q) => q.questionText.trim().toLowerCase())
    );
    const seenInFile = new Set<string>();

    const parsed: ParsedImportRow[] = rawRows.map((row, idx) => {
      const getCol = (keys: string[]) => {
        for (const k of keys) {
          const hit = Object.keys(row).find(
            (rk) => rk.trim().toLowerCase() === k.toLowerCase()
          );
          if (hit !== undefined) return String(row[hit] ?? "").trim();
        }
        return "";
      };

      const qText = getCol(["Question", "Question Text", "questionText"]);
      const rawType = getCol(["Type", "Question Type", "questionType"]) || "single_mcq";
      const qType = normalizeType(rawType);
      const subj = getCol(["Subject", "subject"]);
      const tpc = getCol(["Topic", "topic"]) || "General";
      const crs = getCol(["Course", "courseName"]);
      const rawDiff = (getCol(["Difficulty", "difficulty"]) || "medium").toLowerCase();
      const diff: QuestionDifficulty =
        rawDiff === "easy" || rawDiff === "hard" ? rawDiff : "medium";
      const a = getCol(["Option A", "optA"]);
      const b = getCol(["Option B", "optB"]);
      const c = getCol(["Option C", "optC"]);
      const d = getCol(["Option D", "optD"]);
      const ans = getCol(["Correct Answer", "Correct", "correctAnswer"]);
      const m = Number(getCol(["Marks", "marks"]) || 1);
      const neg = Number(getCol(["Negative Marks", "negativeMarks"]) || 0);
      const expl = getCol(["Explanation", "explanation"]);
      const lang = getCol(["Language", "language"]) || "English";

      const errors: string[] = [];
      if (qText.length < 3) errors.push("Question text missing or too short");
      if (!qType) errors.push(`Unsupported type "${rawType}"`);
      if (!subj) errors.push("Subject is required");
      if (!Number.isFinite(m) || m <= 0) errors.push("Marks must be > 0");

      const normKey = qText.trim().toLowerCase();
      if (normKey && (existingTexts.has(normKey) || seenInFile.has(normKey))) {
        errors.push("Duplicate question");
      }
      if (normKey) seenInFile.add(normKey);

      const isText = qType === "fill_blank" || qType === "short_answer";
      const options = isText
        ? []
        : qType === "true_false"
          ? [
              { id: "A", text: a || "True" },
              { id: "B", text: b || "False" },
            ]
          : [
              ...(a ? [{ id: "A", text: a }] : []),
              ...(b ? [{ id: "B", text: b }] : []),
              ...(c ? [{ id: "C", text: c }] : []),
              ...(d ? [{ id: "D", text: d }] : []),
            ];

      let correctOptionIds: string[] = [];
      let correctTextVal: string | undefined;

      if (isText) {
        if (!ans) errors.push("Correct answer text required");
        else correctTextVal = ans;
      } else {
        if (options.length < 2) errors.push("At least Option A & Option B required");
        const optIds = new Set(options.map((o) => o.id));
        correctOptionIds = ans
          .split(/[,;|]/)
          .map((s) => s.trim().toUpperCase())
          .filter((id) => optIds.has(id));
        if (correctOptionIds.length === 0) {
          errors.push("Correct Answer must match option letter(s) e.g. A or A,B");
        }
      }

      return {
        rowNumber: idx + 2,
        valid: errors.length === 0,
        ...(errors.length > 0 ? { error: errors.join("; ") } : {}),
        questionText: qText,
        questionType: qType ?? "single_mcq",
        subject: subj,
        topic: tpc,
        ...(crs ? { courseName: crs } : {}),
        difficulty: diff,
        options,
        correctOptionIds,
        ...(correctTextVal ? { correctText: correctTextVal } : {}),
        marks: Number.isFinite(m) && m > 0 ? m : 1,
        negativeMarks: Number.isFinite(neg) && neg >= 0 ? neg : 0,
        explanation: expl,
        language: lang,
      };
    });

    setImportRows(parsed);
  };

  const downloadErrorReport = () => {
    if (!importRows) return;
    const invalid = importRows.filter((r) => !r.valid);
    const data = invalid.map((r) => ({
      Row: r.rowNumber,
      Error: r.error ?? "Invalid",
      Question: r.questionText,
      Subject: r.subject,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Errors");
    XLSX.writeFile(wb, "question-import-errors.csv", { bookType: "csv" });
  };

  const confirmImport = async () => {
    if (!importRows) return;
    const validRows = importRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/institute/question-bank/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: validRows.map((r) => ({
            questionText: r.questionText,
            questionType: r.questionType,
            subject: r.subject,
            topic: r.topic,
            courseName: r.courseName,
            difficulty: r.difficulty,
            options: r.options,
            correctOptionIds: r.correctOptionIds,
            correctText: r.correctText,
            marks: r.marks,
            negativeMarks: r.negativeMarks,
            explanation: r.explanation,
            language: r.language,
          })),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          importedCount: number;
          skippedDuplicates: number;
          questions: QuestionBankRecord[];
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Import failed.");
        return;
      }
      setQuestions((prev) => [...json.data!.questions, ...prev]);
      setMessage(
        `Imported ${json.data.importedCount} question(s) (${json.data.skippedDuplicates} duplicates skipped).`
      );
      setImportRows(null);
      router.refresh();
    } finally {
      setImporting(false);
    }
  };

  const handleExport = (format: "xlsx" | "csv") => {
    const source =
      selectedIds.size > 0 ? filtered.filter((q) => selectedIds.has(q.id)) : filtered;
    const rows = source.map((q) => ({
      Question: q.questionText,
      Type: q.questionType,
      Subject: q.subject,
      Topic: q.topic,
      Course: q.courseName ?? "",
      Difficulty: q.difficulty,
      "Option A": q.options.find((o) => o.id === "A")?.text ?? "",
      "Option B": q.options.find((o) => o.id === "B")?.text ?? "",
      "Option C": q.options.find((o) => o.id === "C")?.text ?? "",
      "Option D": q.options.find((o) => o.id === "D")?.text ?? "",
      "Correct Answer": q.correctText || q.correctOptionIds.join(","),
      Marks: q.marks,
      "Negative Marks": q.negativeMarks,
      Explanation: q.explanation,
      Language: q.language ?? "English",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QuestionBank");
    XLSX.writeFile(
      wb,
      format === "xlsx" ? "certidesk-question-bank.xlsx" : "certidesk-question-bank.csv",
      format === "csv" ? { bookType: "csv" } : undefined
    );
  };

  const handleToggleDeleted = async () => {
    const next = !showDeleted;
    setShowDeleted(next);
    const res = await fetch(
      `/api/institute/question-bank?includeDeleted=${next ? "1" : "0"}`,
      { cache: "no-store" }
    );
    const json = (await res.json()) as {
      ok: boolean;
      data?: { questions: QuestionBankRecord[] };
    };
    if (res.ok && json.ok && json.data) {
      setQuestions(json.data.questions);
    }
  };

  const handleConfirmDelete = async (reason: string) => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/institute/question-bank/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setQuestions((prev) =>
          showDeleted
            ? prev.map((q) =>
                q.id === deleteTarget.id ? { ...q, status: "deleted" } : q
              )
            : prev.filter((q) => q.id !== deleteTarget.id)
        );
        setDeleteTarget(null);
        router.refresh();
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (q: QuestionBankRecord) => {
    const res = await fetch(`/api/institute/question-bank/${q.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    const json = (await res.json()) as {
      ok: boolean;
      data?: { question: QuestionBankRecord };
    };
    if (res.ok && json.ok && json.data) {
      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? json.data!.question : item))
      );
    }
  };

  const filtered = questions.filter((q) => {
    const sOk = filterSubject.trim()
      ? q.subject.toLowerCase().includes(filterSubject.trim().toLowerCase()) ||
        q.topic.toLowerCase().includes(filterSubject.trim().toLowerCase()) ||
        q.questionText.toLowerCase().includes(filterSubject.trim().toLowerCase())
      : true;
    const cOk = filterCourse.trim()
      ? (q.courseName ?? "").toLowerCase().includes(filterCourse.trim().toLowerCase())
      : true;
    return sOk && cOk;
  });

  const validImportCount = importRows?.filter((r) => r.valid).length ?? 0;
  const invalidImportCount = importRows?.filter((r) => !r.valid).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Question Bank ({filtered.length})
          </h2>
          <p className="text-muted text-xs">
            Create individual questions or bulk import/export Excel (.xlsx) &amp; CSV
            question sets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => void handleFileUpload(e)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => downloadTemplate("xlsx")}
          >
            Excel Template
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadTemplate("csv")}
          >
            CSV Template
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Upload className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import Excel / CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => handleExport("xlsx")}
          >
            Export XLSX {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleToggleDeleted()}
          >
            {showDeleted ? "Hide Deleted" : "Show Deleted"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="hidden sm:inline-flex"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={openCreateModal}
          >
            Add Question
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-800/60"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs dark:border-emerald-800/60">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
        <Input
          placeholder="Search question, subject, or topic..."
          leftAddon={<Search className="h-4 w-4" aria-hidden="true" />}
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
        />
        <Input
          placeholder="Filter by course (e.g. ADCA, CCC)..."
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
        />
      </div>

      {/* Question List */}
      <Card>
        <CardHeader className="border-border flex flex-row items-center justify-between border-b">
          <CardTitle>Questions ({filtered.length})</CardTitle>
          {filtered.length > 0 && (
            <button
              type="button"
              className="text-primary cursor-pointer text-xs font-semibold hover:underline"
              onClick={() => {
                if (selectedIds.size === filtered.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(filtered.map((q) => q.id)));
                }
              }}
            >
              {selectedIds.size === filtered.length ? "Clear Selection" : "Select All"}
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {filtered.length === 0 ? (
            <p className="text-muted py-10 text-center text-sm">
              No questions found. Click <strong>Add Question</strong> or{" "}
              <strong>Import Excel / CSV</strong>.
            </p>
          ) : (
            filtered.map((q) => (
              <div
                key={q.id}
                className="border-border bg-surface flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-start"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(q.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(q.id);
                        else next.delete(q.id);
                        return next;
                      });
                    }}
                    className="mt-1"
                    aria-label={`Select question ${q.id}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{q.subject}</Badge>
                      <Badge variant="outline">{q.topic}</Badge>
                      {q.courseName && <Badge variant="primary">{q.courseName}</Badge>}
                      <Badge variant="outline">{q.questionType.replace(/_/g, " ")}</Badge>
                      <Badge
                        variant={
                          q.difficulty === "hard"
                            ? "danger"
                            : q.difficulty === "easy"
                              ? "success"
                              : "warning"
                        }
                      >
                        {q.difficulty}
                      </Badge>
                      {q.status === "deleted" && <Badge variant="danger">Deleted</Badge>}
                      <span className="text-muted text-[11px]">
                        +{q.marks} / -{q.negativeMarks}m
                      </span>
                    </div>
                    <p className="text-foreground mt-2 text-sm font-medium">
                      {q.questionText}
                    </p>
                    {q.options.length > 0 ? (
                      <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                        {q.options.map((opt) => {
                          const isAns = q.correctOptionIds.includes(opt.id);
                          return (
                            <span
                              key={opt.id}
                              className={
                                isAns ? "text-success font-semibold" : "text-muted"
                              }
                            >
                              {opt.id}. {opt.text} {isAns ? "✓" : ""}
                            </span>
                          );
                        })}
                      </div>
                    ) : q.correctText ? (
                      <p className="text-success mt-1.5 text-xs font-semibold">
                        Answer: {q.correctText}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                  {q.status === "deleted" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={() => void handleRestore(q)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(q)}
                        aria-label="Edit question"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(q)}
                        aria-label="Delete question"
                      >
                        <Trash2 className="text-danger h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Mobile FAB */}
      <MobileFab label="Add Question" onClick={openCreateModal} />

      {/* Add / Edit Question Modal */}
      <ResponsiveFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingQuestion ? "Edit Question" : "Add Question"}
        subtitle="Supports MCQ, Multiple Correct, True/False, Fill in Blanks, and Short Answer."
      >
        {error && (
          <div
            role="alert"
            className="bg-danger-soft text-danger mb-4 flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-800/60"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveQuestion(false);
          }}
          className="space-y-4"
        >
          <Textarea
            label="Question Text"
            rows={3}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Format"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              options={[
                { label: "MCQ — Single Correct", value: "single_mcq" },
                { label: "MCQ — Multiple Correct", value: "multi_mcq" },
                { label: "True / False", value: "true_false" },
                { label: "Fill in the Blanks", value: "fill_blank" },
                { label: "Short Answer", value: "short_answer" },
              ]}
            />
            <Input
              label="Subject"
              placeholder="e.g. MS Office"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <Input
              label="Topic"
              placeholder="e.g. Excel Formulas"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input
              label="Course (Optional)"
              placeholder="e.g. ADCA"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
              options={[
                { label: "Easy", value: "easy" },
                { label: "Medium", value: "medium" },
                { label: "Hard", value: "hard" },
              ]}
            />
            <Input
              label="Marks"
              type="number"
              min="0.5"
              step="0.5"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              required
            />
            <Input
              label="Negative Marks"
              type="number"
              min="0"
              step="0.25"
              value={negativeMarks}
              onChange={(e) => setNegativeMarks(e.target.value)}
            />
          </div>

          {questionType === "fill_blank" || questionType === "short_answer" ? (
            <Input
              label="Expected Correct Answer"
              placeholder="Enter exact expected answer..."
              value={correctText}
              onChange={(e) => setCorrectText(e.target.value)}
              required
            />
          ) : questionType === "true_false" ? (
            <Select
              label="Correct Answer"
              value={correctKeys[0] ?? "A"}
              onChange={(e) => setCorrectKeys([e.target.value])}
              options={[
                { label: "A — True", value: "A" },
                { label: "B — False", value: "B" },
              ]}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Option A"
                  value={optA}
                  onChange={(e) => setOptA(e.target.value)}
                  required
                />
                <Input
                  label="Option B"
                  value={optB}
                  onChange={(e) => setOptB(e.target.value)}
                  required
                />
                <Input
                  label="Option C"
                  value={optC}
                  onChange={(e) => setOptC(e.target.value)}
                />
                <Input
                  label="Option D"
                  value={optD}
                  onChange={(e) => setOptD(e.target.value)}
                />
              </div>
              {questionType === "single_mcq" ? (
                <Select
                  label="Correct Option"
                  value={correctKeys[0] ?? "A"}
                  onChange={(e) => setCorrectKeys([e.target.value])}
                  options={[
                    { label: "Option A", value: "A" },
                    { label: "Option B", value: "B" },
                    { label: "Option C", value: "C" },
                    { label: "Option D", value: "D" },
                  ]}
                />
              ) : (
                <div className="space-y-1.5">
                  <p className="text-foreground text-xs font-medium">
                    Correct Options (Select Multiple)
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {["A", "B", "C", "D"].map((k) => (
                      <label key={k} className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={correctKeys.includes(k)}
                          onChange={(e) => {
                            setCorrectKeys((prev) =>
                              e.target.checked
                                ? [...prev, k]
                                : prev.filter((item) => item !== k)
                            );
                          }}
                        />
                        <span>Option {k}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Question Image URL (Optional)"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <Input
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>

          <Textarea
            label="Explanation (Optional)"
            rows={2}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />

          <div className="border-border flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            {!editingQuestion && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={loading}
                onClick={() => void saveQuestion(true)}
              >
                Save &amp; Add Another
              </Button>
            )}
            <Button type="submit" size="sm" loading={loading}>
              {editingQuestion ? "Update Question" : "Save Question"}
            </Button>
          </div>
        </form>
      </ResponsiveFormModal>

      {/* Import Preview Modal */}
      <ResponsiveFormModal
        open={Boolean(importRows)}
        onClose={() => setImportRows(null)}
        title="Spreadsheet Import Preview"
        subtitle={
          importRows
            ? `${validImportCount} valid row(s), ${invalidImportCount} invalid/duplicate row(s).`
            : ""
        }
        maxWidthClass="sm:max-w-4xl"
      >
        {importRows && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <Badge variant="success">Valid: {validImportCount}</Badge>
                <Badge variant={invalidImportCount > 0 ? "danger" : "outline"}>
                  Invalid / Duplicate: {invalidImportCount}
                </Badge>
              </div>
              {invalidImportCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadErrorReport}
                >
                  Download Error Report (CSV)
                </Button>
              )}
            </div>

            <div className="border-border max-h-80 overflow-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="border-border bg-surface text-muted border-b">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Issue</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {importRows.slice(0, 100).map((r) => (
                    <tr key={r.rowNumber}>
                      <td className="px-3 py-2 font-mono">{r.rowNumber}</td>
                      <td className="px-3 py-2">
                        <Badge variant={r.valid ? "success" : "danger"}>
                          {r.valid ? "Valid" : "Invalid"}
                        </Badge>
                      </td>
                      <td className="max-w-xs truncate px-3 py-2">{r.questionText}</td>
                      <td className="px-3 py-2">{r.subject}</td>
                      <td className="text-danger px-3 py-2">{r.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-border flex justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImportRows(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                loading={importing}
                disabled={validImportCount === 0}
                onClick={() => void confirmImport()}
              >
                Import {validImportCount} Valid Question(s)
              </Button>
            </div>
          </div>
        )}
      </ResponsiveFormModal>

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(reason) => handleConfirmDelete(reason)}
        title="Delete Question"
        recordLabel={deleteTarget ? deleteTarget.questionText.slice(0, 60) : ""}
        affectedSummary="Soft-deletes this question from active Question Bank listings. Existing exam snapshots remain intact."
        loading={deleteLoading}
      />
    </div>
  );
}
