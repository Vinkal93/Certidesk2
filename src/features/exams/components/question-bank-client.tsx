"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  QuestionBankRecord,
  QuestionDifficulty,
  QuestionType,
} from "@/types/online-exam";

export function QuestionBankClient({
  initialQuestions,
}: {
  initialQuestions: QuestionBankRecord[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = React.useState(initialQuestions);
  const [questionText, setQuestionText] = React.useState("");
  const [questionType, setQuestionType] = React.useState<QuestionType>("single_mcq");
  const [subject, setSubject] = React.useState("");
  const [topic, setTopic] = React.useState("Core");
  const [difficulty, setDifficulty] = React.useState<QuestionDifficulty>("medium");
  const [optA, setOptA] = React.useState("");
  const [optB, setOptB] = React.useState("");
  const [optC, setOptC] = React.useState("");
  const [optD, setOptD] = React.useState("");
  const [correctKey, setCorrectKey] = React.useState("A");
  const [marks, setMarks] = React.useState("2");
  const [negativeMarks, setNegativeMarks] = React.useState("0");
  const [filterSubject, setFilterSubject] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const options = [
        { id: "A", text: optA },
        { id: "B", text: optB },
        ...(optC.trim() ? [{ id: "C", text: optC }] : []),
        ...(optD.trim() ? [{ id: "D", text: optD }] : []),
      ];
      const res = await fetch("/api/institute/question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText,
          questionType,
          subject,
          topic,
          difficulty,
          options,
          correctOptionIds: [correctKey],
          marks: Number(marks),
          negativeMarks: Number(negativeMarks || 0),
        }),
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
      setQuestions((prev) => [json.data!.question, ...prev]);
      setQuestionText("");
      setOptA("");
      setOptB("");
      setOptC("");
      setOptD("");
      setMessage("Question added to institute bank.");
      router.refresh();
    } catch {
      setError("Network error while saving question.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = filterSubject.trim()
    ? questions.filter((q) =>
        q.subject.toLowerCase().includes(filterSubject.trim().toLowerCase())
      )
    : questions;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Add Question to Bank</CardTitle>
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

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Question Text *"
              required
              placeholder="Enter MCQ question..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Subject *"
                required
                placeholder="e.g. Tally GST"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <Input
                label="Topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select
                label="Type"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                options={[
                  { label: "Single MCQ", value: "single_mcq" },
                  { label: "Multi MCQ", value: "multi_mcq" },
                ]}
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
                min={1}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Option A *"
                required
                value={optA}
                onChange={(e) => setOptA(e.target.value)}
              />
              <Input
                label="Option B *"
                required
                value={optB}
                onChange={(e) => setOptB(e.target.value)}
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
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Correct Option"
                value={correctKey}
                onChange={(e) => setCorrectKey(e.target.value)}
                options={[
                  { label: "Option A", value: "A" },
                  { label: "Option B", value: "B" },
                  { label: "Option C", value: "C" },
                  { label: "Option D", value: "D" },
                ]}
              />
              <Input
                label="Negative Marks"
                type="number"
                min={0}
                step="0.25"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              loading={loading}
              fullWidth
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Save Question
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Question Bank ({filtered.length})</CardTitle>
          <Input
            placeholder="Filter by subject..."
            className="w-44"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          <div className="divide-border divide-y text-xs">
            {filtered.length === 0 ? (
              <p className="text-muted py-6 text-center">No questions found.</p>
            ) : (
              filtered.map((q) => (
                <div key={q.id} className="space-y-1.5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-foreground text-sm font-medium">
                      {q.questionText}
                    </p>
                    <Badge variant="primary">{q.marks}m</Badge>
                  </div>
                  <p className="text-muted">
                    {q.subject} · {q.topic} · {q.difficulty} · Key:{" "}
                    {q.correctOptionIds.join(", ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
