import "server-only";
import { randomInt } from "node:crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection, studentsCollection } from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import { computeGradeAndResult } from "./exam.service";
import type { CollectionReference } from "firebase-admin/firestore";
import type { BatchRecord } from "@/types/academic";
import type { SessionUser } from "@/types/auth";
import type {
  BatchComparisonRow,
  ExamAttemptRecord,
  ExamQuestionAnalysisItem,
  ExamQuestionSnapshotItem,
  ExamResultRecord,
  OnlineExamAnalyticsSummary,
  OnlineExamRecord,
  OnlineExamStatus,
  QuestionBankRecord,
  QuestionDifficulty,
  QuestionOption,
  QuestionType,
  ResultRevisionRecord,
} from "@/types/online-exam";

function batchesCol() {
  return getAdminFirestore().collection("batches") as CollectionReference<BatchRecord>;
}

function questionBankCol() {
  return getAdminFirestore().collection(
    "questionBank"
  ) as CollectionReference<QuestionBankRecord>;
}

function onlineExamsCol() {
  return getAdminFirestore().collection(
    "onlineExams"
  ) as CollectionReference<OnlineExamRecord>;
}

function examAttemptsCol() {
  return getAdminFirestore().collection(
    "examAttempts"
  ) as CollectionReference<ExamAttemptRecord>;
}

function examResultsCol() {
  return getAdminFirestore().collection(
    "examResults"
  ) as CollectionReference<ExamResultRecord>;
}

function resultRevisionsCol() {
  return getAdminFirestore().collection(
    "resultRevisions"
  ) as CollectionReference<ResultRevisionRecord>;
}

/**
 * Unbiased Fisher-Yates shuffle using Node crypto.randomInt.
 */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Selects `count` unique random questions from an active question pool.
 */
export function selectUniqueRandomQuestions(
  pool: readonly QuestionBankRecord[],
  count: number
): QuestionBankRecord[] {
  if (count <= 0) return [];
  if (pool.length <= count) return shuffleArray(pool);
  return shuffleArray(pool).slice(0, count);
}

/**
 * Builds a per-student question snapshot from the exam's frozen question set.
 * Shuffles question order and/or option order independently per student while
 * preserving each option's `id` so grading remains 100% accurate.
 */
export function buildShuffledStudentSnapshot(
  questions: readonly QuestionBankRecord[],
  randomizeQuestions: boolean,
  randomizeOptions: boolean
): ExamQuestionSnapshotItem[] {
  const orderedQuestions = randomizeQuestions ? shuffleArray(questions) : [...questions];
  return orderedQuestions.map((q) => ({
    questionId: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    subject: q.subject,
    options: randomizeOptions ? shuffleArray(q.options) : [...q.options],
    marks: q.marks,
    negativeMarks: q.negativeMarks,
  }));
}

/**
 * Pure server-side MCQ grading helper. Exported for unit testing.
 * Never trusts client-submitted scores or unvalidated option IDs.
 */
export function gradeMcqAttempt(params: {
  snapshot: ExamQuestionSnapshotItem[];
  answerKeyByQuestionId: Map<string, string[]>;
  submittedAnswers: Record<string, string[]>;
  negativeMarkingEnabled: boolean;
  negativeMarkingPerQuestion?: number | undefined;
  maxMarks: number;
  passingMarks: number;
}): {
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  attemptedCount: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
} {
  let rawMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const q of params.snapshot) {
    const validIds = new Set(q.options.map((o) => o.id));
    const submitted = (params.submittedAnswers[q.questionId] ?? []).filter((id) =>
      validIds.has(id)
    );
    if (submitted.length === 0) {
      unansweredCount += 1;
      continue;
    }

    const expected = new Set(params.answerKeyByQuestionId.get(q.questionId) ?? []);
    const submittedSet = new Set(submitted);
    const isExactMatch =
      expected.size > 0 &&
      submittedSet.size === expected.size &&
      Array.from(expected).every((id) => submittedSet.has(id));

    if (isExactMatch) {
      correctCount += 1;
      rawMarks += q.marks;
    } else {
      incorrectCount += 1;
      if (params.negativeMarkingEnabled) {
        const penalty =
          q.negativeMarks > 0
            ? q.negativeMarks
            : (params.negativeMarkingPerQuestion ?? 0);
        if (penalty > 0) {
          rawMarks -= penalty;
        }
      }
    }
  }

  const obtainedMarks = Math.max(
    0,
    Math.min(params.maxMarks, Number(rawMarks.toFixed(2)))
  );
  const percentage =
    params.maxMarks > 0
      ? Number(((obtainedMarks / params.maxMarks) * 100).toFixed(2))
      : 0;
  const passed = obtainedMarks >= params.passingMarks;
  const { grade } = computeGradeAndResult(percentage, passed);

  return {
    correctCount,
    incorrectCount,
    unansweredCount,
    attemptedCount: correctCount + incorrectCount,
    obtainedMarks,
    percentage,
    grade,
    passed,
  };
}

// ─── QUESTION BANK ────────────────────────────────────────────────────────────

export async function listQuestionBank(actor: SessionUser, includeDeleted = false) {
  if (!hasStaffPermission(actor, "exams:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await questionBankCol().where("instituteId", "==", institute.id).get();
  return snap.docs
    .map((d) => d.data())
    .filter((q) => includeDeleted || q.status !== "deleted")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface QuestionBankCreateInput {
  questionText: string;
  imageUrl?: string | undefined;
  questionType: QuestionType;
  subject: string;
  topic: string;
  courseName?: string | undefined;
  language?: string | undefined;
  difficulty: QuestionDifficulty;
  options: QuestionOption[];
  correctOptionIds: string[];
  correctText?: string | undefined;
  marks: number;
  negativeMarks?: number | undefined;
  explanation?: string | undefined;
  status?: "active" | "archived" | undefined;
}

function validateAndBuildQuestionRecord(
  actor: SessionUser,
  instituteId: string,
  input: QuestionBankCreateInput,
  existing?: QuestionBankRecord
): QuestionBankRecord {
  const isTextAnswer =
    input.questionType === "fill_blank" || input.questionType === "short_answer";
  const validIds = new Set(input.options.map((o) => o.id));
  const cleanCorrect = isTextAnswer
    ? []
    : input.correctOptionIds.filter((id) => validIds.has(id));

  if (!isTextAnswer && cleanCorrect.length === 0) {
    throw new AuthError(400, "INVALID_ANSWER_KEY", "Select at least one valid option.");
  }
  if (isTextAnswer && !input.correctText?.trim()) {
    throw new AuthError(400, "INVALID_ANSWER_KEY", "Provide the expected answer text.");
  }

  const now = new Date().toISOString();
  const id = existing?.id ?? generateId("QBN");
  return {
    id,
    instituteId,
    questionText: input.questionText.trim(),
    ...(input.imageUrl?.trim() ? { imageUrl: input.imageUrl.trim() } : {}),
    questionType: input.questionType,
    subject: input.subject.trim(),
    topic: input.topic.trim() || "General",
    ...(input.courseName?.trim() ? { courseName: input.courseName.trim() } : {}),
    ...(input.language?.trim() ? { language: input.language.trim() } : {}),
    difficulty: input.difficulty,
    options: input.options,
    correctOptionIds: cleanCorrect,
    ...(input.correctText?.trim() ? { correctText: input.correctText.trim() } : {}),
    marks: input.marks,
    negativeMarks: Math.max(0, input.negativeMarks ?? 0),
    explanation: input.explanation?.trim() ?? "",
    status: (input.status ?? existing?.status === "archived") ? "archived" : "active",
    createdBy: existing?.createdBy ?? actor.uid,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function createQuestionBankItem(
  actor: SessionUser,
  input: QuestionBankCreateInput
): Promise<QuestionBankRecord> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const record = validateAndBuildQuestionRecord(actor, institute.id, input);
  await questionBankCol().doc(record.id).set(record);
  return record;
}

export async function updateQuestionBankItem(
  actor: SessionUser,
  questionId: string,
  input: QuestionBankCreateInput
): Promise<QuestionBankRecord> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = questionBankCol().doc(questionId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "QUESTION_NOT_FOUND", "Question not found.");
  }
  const updated = validateAndBuildQuestionRecord(actor, institute.id, input, existing);
  await ref.set(updated);
  return updated;
}

export async function deleteQuestionBankItem(
  actor: SessionUser,
  questionId: string,
  reason = "Deleted by administrator"
): Promise<{ deleted: true; id: string }> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = questionBankCol().doc(questionId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "QUESTION_NOT_FOUND", "Question not found.");
  }
  const now = new Date().toISOString();
  await ref.update({
    status: "deleted",
    deletedAt: now,
    deletedBy: actor.uid,
    deletionReason: reason.trim() || "Deleted by administrator",
    updatedAt: now,
  });
  await recordAuditLog({
    action: "QUESTION_DELETED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: questionId,
    metadata: { reason: reason.trim() },
  });
  return { deleted: true, id: questionId };
}

export async function restoreQuestionBankItem(
  actor: SessionUser,
  questionId: string
): Promise<QuestionBankRecord> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = questionBankCol().doc(questionId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "QUESTION_NOT_FOUND", "Question not found.");
  }
  const restored: QuestionBankRecord = {
    ...existing,
    status: "active",
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    updatedAt: new Date().toISOString(),
  };
  await ref.set(restored);
  return restored;
}

export async function bulkImportQuestionBankItems(
  actor: SessionUser,
  items: QuestionBankCreateInput[]
): Promise<{
  importedCount: number;
  skippedDuplicates: number;
  questions: QuestionBankRecord[];
}> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const existingSnap = await questionBankCol()
    .where("instituteId", "==", institute.id)
    .get();
  const existingTexts = new Set(
    existingSnap.docs
      .filter((d) => d.data().status !== "deleted")
      .map((d) => d.data().questionText.trim().toLowerCase())
  );

  const created: QuestionBankRecord[] = [];
  let skippedDuplicates = 0;

  for (const item of items) {
    const key = item.questionText.trim().toLowerCase();
    if (existingTexts.has(key)) {
      skippedDuplicates++;
      continue;
    }
    existingTexts.add(key);
    created.push(validateAndBuildQuestionRecord(actor, institute.id, item));
  }

  const db = getAdminFirestore();
  for (let i = 0; i < created.length; i += 400) {
    const chunk = created.slice(i, i + 400);
    const batch = db.batch();
    for (const q of chunk) {
      batch.set(questionBankCol().doc(q.id), q);
    }
    await batch.commit();
  }

  await recordAuditLog({
    action: "QUESTION_IMPORTED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: institute.id,
    metadata: { importedCount: created.length, skippedDuplicates },
  });

  return {
    importedCount: created.length,
    skippedDuplicates,
    questions: created,
  };
}

// ─── ONLINE EXAMS ─────────────────────────────────────────────────────────────

export async function listOnlineExams(actor: SessionUser) {
  if (!hasStaffPermission(actor, "exams:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await onlineExamsCol().where("instituteId", "==", institute.id).get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function matchesQuestionPool(q: QuestionBankRecord, poolTag: string): boolean {
  if (q.status !== "active") return false;
  const tag = poolTag.trim().toLowerCase();
  if (!tag || tag === "__all__" || tag === "all") return true;
  const course = (q.courseName ?? "").trim().toLowerCase();
  const subject = q.subject.trim().toLowerCase();
  return (
    course === tag || subject === tag || course.includes(tag) || tag.includes(course)
  );
}

export async function createOnlineExam(
  actor: SessionUser,
  input: {
    title: string;
    code: string;
    description?: string | undefined;
    courseId: string;
    courseName: string;
    questionPoolTag?: string | undefined;
    batchIds: string[];
    instructions?: string | undefined;
    questionCount?: number | undefined;
    maxMarks: number;
    passingMarks: number;
    durationMinutes: number;
    windowStartAt: string;
    windowEndAt: string;
    allowedAttempts?: number | undefined;
    questionIds?: string[] | undefined;
    randomizeQuestions?: boolean | undefined;
    randomizeOptions?: boolean | undefined;
    negativeMarkingEnabled?: boolean | undefined;
    negativeMarkingPerQuestion?: number | undefined;
    allowStudentAnswerReview?: boolean | undefined;
  }
): Promise<OnlineExamRecord> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  if (input.batchIds.length === 0) {
    throw new AuthError(400, "BATCH_REQUIRED", "Assign at least one eligible batch.");
  }
  if (input.passingMarks > input.maxMarks) {
    throw new AuthError(
      400,
      "INVALID_MARKS",
      "Passing marks cannot exceed maximum marks."
    );
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const poolTag = (input.questionPoolTag ?? input.courseName).trim();
  const requestedCount = input.questionCount ?? input.questionIds?.length ?? 0;

  if (requestedCount > 0 && (!input.questionIds || input.questionIds.length === 0)) {
    const qSnap = await questionBankCol().where("instituteId", "==", institute.id).get();
    const eligibleCount = qSnap.docs
      .map((d) => d.data())
      .filter((q) => matchesQuestionPool(q, poolTag)).length;
    if (eligibleCount < requestedCount) {
      throw new AuthError(
        400,
        "INSUFFICIENT_QUESTIONS",
        `Question bank for "${poolTag}" has only ${eligibleCount} active question(s), but ${requestedCount} were requested.`
      );
    }
  }

  const now = new Date().toISOString();
  const id = generateId("OEX");

  const record: OnlineExamRecord = {
    id,
    instituteId: institute.id,
    title: input.title.trim(),
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() ?? "",
    courseId: input.courseId,
    courseName: input.courseName,
    questionPoolTag: poolTag,
    batchIds: input.batchIds,
    examType: "mcq",
    instructions:
      input.instructions?.trim() ||
      "Read each question carefully. Answers are autosaved automatically.",
    questionCount: requestedCount > 0 ? requestedCount : undefined,
    maxMarks: input.maxMarks,
    passingMarks: input.passingMarks,
    durationMinutes: input.durationMinutes,
    windowStartAt: input.windowStartAt,
    windowEndAt: input.windowEndAt,
    timezone: "Asia/Kolkata",
    allowedAttempts: input.allowedAttempts ?? 1,
    questionIds: input.questionIds ?? [],
    randomizeQuestions: input.randomizeQuestions ?? true,
    randomizeOptions: input.randomizeOptions ?? true,
    negativeMarkingEnabled: input.negativeMarkingEnabled ?? false,
    negativeMarkingPerQuestion: input.negativeMarkingPerQuestion ?? 0,
    allowStudentAnswerReview: input.allowStudentAnswerReview ?? true,
    status: "draft",
    resultsDeclaredAt: null,
    resultsDeclaredByUid: null,
    cancelledAt: null,
    resultVersion: 1,
    createdBy: actor.uid,
    createdAt: now,
    updatedAt: now,
  };

  await onlineExamsCol().doc(id).set(record);
  await recordAuditLog({
    action: "ONLINE_EXAM_CREATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: id,
    metadata: {
      title: record.title,
      code: record.code,
      questionCount: requestedCount,
      questionPoolTag: poolTag,
    },
  });
  return record;
}

export async function getOnlineExamDetails(actor: SessionUser, examId: string) {
  if (!hasStaffPermission(actor, "exams:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const examSnap = await onlineExamsCol().doc(examId).get();
  const exam = examSnap.data();
  if (!examSnap.exists || !exam || exam.instituteId !== institute.id) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }

  const [attemptsSnap, resultsSnap, batchesSnap] = await Promise.all([
    examAttemptsCol().where("examId", "==", exam.id).get(),
    examResultsCol().where("examId", "==", exam.id).get(),
    batchesCol().where("instituteId", "==", institute.id).get(),
  ]);

  const attempts = attemptsSnap.docs.map((d) => d.data());
  const batchNameById = new Map(
    batchesSnap.docs.map((d) => [d.id, d.data().name] as const)
  );

  // Sort by marks desc, then timeTaken asc for merit list / rank
  const rankedResults = resultsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => {
      if (b.obtainedMarks !== a.obtainedMarks) return b.obtainedMarks - a.obtainedMarks;
      return (a.timeTakenSeconds ?? 999999) - (b.timeTakenSeconds ?? 999999);
    })
    .map((r, index) => ({
      ...r,
      rank: index + 1,
    }));

  const marksList = rankedResults.map((r) => r.obtainedMarks);
  const highestMarks = marksList.length > 0 ? Math.max(...marksList) : 0;
  const lowestMarks = marksList.length > 0 ? Math.min(...marksList) : 0;
  const averageMarks =
    marksList.length > 0
      ? Number((marksList.reduce((acc, v) => acc + v, 0) / marksList.length).toFixed(2))
      : 0;
  const passedTotal = rankedResults.filter((r) => r.passed).length;
  const passPercentage =
    rankedResults.length > 0
      ? Number(((passedTotal / rankedResults.length) * 100).toFixed(2))
      : 0;

  const byBatch = new Map<string, ExamResultRecord[]>();
  for (const r of rankedResults) {
    const key = r.batchId || "unassigned";
    const list = byBatch.get(key) ?? [];
    list.push(r);
    byBatch.set(key, list);
  }

  const batchComparison: BatchComparisonRow[] = Array.from(byBatch.entries()).map(
    ([batchId, items]) => {
      const bMarks = items.map((i) => i.obtainedMarks);
      const bPassed = items.filter((i) => i.passed).length;
      return {
        batchId,
        batchName: batchNameById.get(batchId) ?? (batchId || "Default Batch"),
        submittedCount: items.length,
        passedCount: bPassed,
        passPercentage:
          items.length > 0 ? Number(((bPassed / items.length) * 100).toFixed(2)) : 0,
        averageMarks:
          bMarks.length > 0
            ? Number((bMarks.reduce((a, b) => a + b, 0) / bMarks.length).toFixed(2))
            : 0,
        highestMarks: bMarks.length > 0 ? Math.max(...bMarks) : 0,
        lowestMarks: bMarks.length > 0 ? Math.min(...bMarks) : 0,
      };
    }
  );

  const analytics: OnlineExamAnalyticsSummary = {
    totalResults: rankedResults.length,
    submittedAttempts: attempts.filter((a) => a.status !== "in_progress").length,
    inProgressAttempts: attempts.filter((a) => a.status === "in_progress").length,
    highestMarks,
    lowestMarks,
    averageMarks,
    passPercentage,
    batchComparison,
  };

  return {
    exam,
    attempts,
    results: rankedResults,
    analytics,
    batchNames: Object.fromEntries(batchNameById.entries()),
  };
}

export async function updateOnlineExam(
  actor: SessionUser,
  examId: string,
  patch: {
    title?: string | undefined;
    questionIds?: string[] | undefined;
    questionCount?: number | undefined;
    questionPoolTag?: string | undefined;
    batchIds?: string[] | undefined;
    instructions?: string | undefined;
    passingMarks?: number | undefined;
    maxMarks?: number | undefined;
    negativeMarkingEnabled?: boolean | undefined;
    negativeMarkingPerQuestion?: number | undefined;
    allowStudentAnswerReview?: boolean | undefined;
    status?: OnlineExamStatus | undefined;
    windowStartAt?: string | undefined;
    windowEndAt?: string | undefined;
    durationMinutes?: number | undefined;
  }
): Promise<OnlineExamRecord> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = onlineExamsCol().doc(examId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }

  let resolvedQuestionIds = patch.questionIds ?? existing.questionIds;
  let resolvedMaxMarks = patch.maxMarks ?? existing.maxMarks;

  // When publishing for the first time with no frozen question snapshot,
  // automatically select unique random questions ONCE and freeze them forever.
  if (patch.status === "published" && resolvedQuestionIds.length === 0) {
    const poolTag =
      patch.questionPoolTag ?? existing.questionPoolTag ?? existing.courseName;
    const targetCount = patch.questionCount ?? existing.questionCount ?? 20;
    const qSnap = await questionBankCol().where("instituteId", "==", institute.id).get();
    const eligiblePool = qSnap.docs
      .map((d) => d.data())
      .filter((q) => matchesQuestionPool(q, poolTag));

    if (eligiblePool.length < targetCount) {
      throw new AuthError(
        400,
        "INSUFFICIENT_QUESTIONS",
        `Cannot publish: Question bank for "${poolTag}" has ${eligiblePool.length} active question(s), but ${targetCount} are required.`
      );
    }

    const selected = selectUniqueRandomQuestions(eligiblePool, targetCount);
    resolvedQuestionIds = selected.map((q) => q.id);
    if (resolvedMaxMarks <= 0) {
      resolvedMaxMarks = selected.reduce((sum, q) => sum + q.marks, 0);
    }
  }

  const now = new Date().toISOString();
  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<OnlineExamRecord>;

  const next: OnlineExamRecord = {
    ...existing,
    ...cleanPatch,
    questionIds: resolvedQuestionIds,
    maxMarks: resolvedMaxMarks,
    cancelledAt: patch.status === "cancelled" ? now : (existing.cancelledAt ?? null),
    updatedAt: now,
  };
  await ref.set(next);

  if (patch.status) {
    await recordAuditLog({
      action:
        patch.status === "published"
          ? "ONLINE_EXAM_PUBLISHED"
          : patch.status === "cancelled"
            ? "ONLINE_EXAM_CANCELLED"
            : "ONLINE_EXAM_UPDATED",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId: institute.id,
      targetId: examId,
      metadata: {
        status: patch.status,
        frozenQuestionCount: resolvedQuestionIds.length,
      },
    });
  }

  return next;
}

export async function declareOnlineExamResults(
  actor: SessionUser,
  examId: string
): Promise<{ declaredCount: number }> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const examRef = onlineExamsCol().doc(examId);
  const examSnap = await examRef.get();
  const exam = examSnap.data();
  if (!examSnap.exists || !exam || exam.instituteId !== institute.id) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }

  const resultsSnap = await examResultsCol().where("examId", "==", exam.id).get();
  const now = new Date().toISOString();
  const db = getAdminFirestore();
  const batch = db.batch();

  for (const doc of resultsSnap.docs) {
    batch.update(doc.ref, {
      declared: true,
      declaredAt: now,
      declaredByUid: actor.uid,
    });
  }
  batch.update(examRef, {
    status: "results_declared",
    resultsDeclaredAt: now,
    resultsDeclaredByUid: actor.uid,
    updatedAt: now,
  });

  await batch.commit();

  // Notify students whose results were declared
  for (const doc of resultsSnap.docs) {
    const res = doc.data();
    const ntfId = generateId("NTF");
    await db
      .collection("notifications")
      .doc(ntfId)
      .set({
        id: ntfId,
        instituteId: institute.id,
        studentId: res.studentId,
        audience: "student",
        type: "result_published",
        title: `Result Declared: ${exam.title}`,
        message: `Your result for ${exam.title} is now available (${res.obtainedMarks}/${res.maxMarks}, Grade ${res.grade}).`,
        relatedResourceId: res.id,
        read: false,
        createdAt: now,
      });
  }

  await recordAuditLog({
    action: "ONLINE_EXAM_RESULTS_DECLARED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: exam.id,
    metadata: { declaredCount: resultsSnap.size },
  });

  return { declaredCount: resultsSnap.size };
}

export async function hideOnlineExamResults(
  actor: SessionUser,
  examId: string
): Promise<{ hiddenCount: number }> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const examRef = onlineExamsCol().doc(examId);
  const examSnap = await examRef.get();
  const exam = examSnap.data();
  if (!examSnap.exists || !exam || exam.instituteId !== institute.id) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }

  const resultsSnap = await examResultsCol().where("examId", "==", exam.id).get();
  const now = new Date().toISOString();
  const db = getAdminFirestore();
  const batch = db.batch();

  for (const doc of resultsSnap.docs) {
    batch.update(doc.ref, { declared: false });
  }
  batch.update(examRef, {
    status: "results_ready",
    updatedAt: now,
  });

  await batch.commit();

  await recordAuditLog({
    action: "ONLINE_EXAM_RESULTS_HIDDEN",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: exam.id,
    metadata: { hiddenCount: resultsSnap.size },
  });

  return { hiddenCount: resultsSnap.size };
}

export async function reevaluateOnlineExamResults(
  actor: SessionUser,
  examId: string,
  reason: string
): Promise<{ reevaluatedCount: number; updatedCount: number }> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const examRef = onlineExamsCol().doc(examId);
  const examSnap = await examRef.get();
  const exam = examSnap.data();
  if (!examSnap.exists || !exam || exam.instituteId !== institute.id) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }

  const [qSnap, attemptsSnap, resultsSnap] = await Promise.all([
    questionBankCol().where("instituteId", "==", institute.id).get(),
    examAttemptsCol().where("examId", "==", exam.id).get(),
    examResultsCol().where("examId", "==", exam.id).get(),
  ]);

  const answerKeys = new Map<string, string[]>();
  for (const doc of qSnap.docs) {
    answerKeys.set(doc.id, doc.data().correctOptionIds);
  }

  const attemptById = new Map(attemptsSnap.docs.map((d) => [d.id, d.data()]));
  const now = new Date().toISOString();
  const db = getAdminFirestore();
  const batch = db.batch();
  let updatedCount = 0;

  for (const resDoc of resultsSnap.docs) {
    const existing = resDoc.data();
    const attempt = attemptById.get(existing.attemptId);
    if (!attempt) continue;

    const graded = gradeMcqAttempt({
      snapshot: attempt.questionSnapshot,
      answerKeyByQuestionId: answerKeys,
      submittedAnswers: attempt.answers,
      negativeMarkingEnabled: exam.negativeMarkingEnabled,
      negativeMarkingPerQuestion: exam.negativeMarkingPerQuestion,
      maxMarks: exam.maxMarks,
      passingMarks: exam.passingMarks,
    });

    if (graded.obtainedMarks !== existing.obtainedMarks) {
      updatedCount += 1;
      const revId = generateId("REV");
      const revision: ResultRevisionRecord = {
        id: revId,
        instituteId: institute.id,
        examId: exam.id,
        resultId: existing.id,
        studentId: existing.studentId,
        oldMarks: existing.obtainedMarks,
        newMarks: graded.obtainedMarks,
        reason: reason.trim() || "Bulk re-evaluation",
        actorUid: actor.uid,
        createdAt: now,
      };
      batch.set(resultRevisionsCol().doc(revId), revision);
    }

    batch.update(resDoc.ref, {
      correctCount: graded.correctCount,
      incorrectCount: graded.incorrectCount,
      unansweredCount: graded.unansweredCount,
      attemptedCount: graded.attemptedCount,
      obtainedMarks: graded.obtainedMarks,
      percentage: graded.percentage,
      grade: graded.grade,
      passed: graded.passed,
      gradingVersion: existing.gradingVersion + 1,
      evaluatedAt: now,
    });
  }

  batch.update(examRef, {
    resultVersion: (exam.resultVersion ?? 1) + 1,
    updatedAt: now,
  });

  await batch.commit();

  await recordAuditLog({
    action: "ONLINE_EXAM_REEVALUATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: exam.id,
    metadata: {
      reevaluatedCount: resultsSnap.size,
      updatedCount,
      reason: reason.trim(),
    },
  });

  return { reevaluatedCount: resultsSnap.size, updatedCount };
}

export async function getExamAttemptAnalysis(
  actor: SessionUser,
  examId: string,
  attemptId: string
): Promise<{
  exam: OnlineExamRecord;
  attempt: ExamAttemptRecord;
  result: ExamResultRecord | null;
  analysis: ExamQuestionAnalysisItem[];
}> {
  let instituteId: string;
  let isStudent = false;
  if (actor.role === "student") {
    const { student, institute } = await resolveVerifiedStudent(actor);
    instituteId = institute.id;
    isStudent = true;
    const attemptSnap = await examAttemptsCol().doc(attemptId).get();
    const attempt = attemptSnap.data();
    if (
      !attemptSnap.exists ||
      !attempt ||
      attempt.studentId !== student.id ||
      attempt.instituteId !== instituteId ||
      attempt.examId !== examId
    ) {
      throw new AuthError(404, "ATTEMPT_NOT_FOUND", "Exam attempt not found.");
    }
  } else {
    if (!hasStaffPermission(actor, "exams:read")) {
      throw new AuthError(403, "FORBIDDEN", "Missing exams:read permission.");
    }
    const institute = await resolveAuthorizedInstitute(actor);
    instituteId = institute.id;
  }

  const [examSnap, attemptSnap, resultsSnap, qSnap] = await Promise.all([
    onlineExamsCol().doc(examId).get(),
    examAttemptsCol().doc(attemptId).get(),
    examResultsCol().where("attemptId", "==", attemptId).get(),
    questionBankCol().where("instituteId", "==", instituteId).get(),
  ]);

  const exam = examSnap.data();
  const attempt = attemptSnap.data();
  const result = resultsSnap.docs[0]?.data() ?? null;

  if (!examSnap.exists || !exam || exam.instituteId !== instituteId) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }
  if (!attemptSnap.exists || !attempt || attempt.instituteId !== instituteId) {
    throw new AuthError(404, "ATTEMPT_NOT_FOUND", "Attempt not found.");
  }
  if (isStudent && (!result?.declared || exam.allowStudentAnswerReview === false)) {
    throw new AuthError(
      403,
      "REVIEW_NOT_AVAILABLE",
      "Answer analysis is only available after results are declared."
    );
  }

  const qMap = new Map(qSnap.docs.map((d) => [d.id, d.data()]));
  const analysis: ExamQuestionAnalysisItem[] = attempt.questionSnapshot.map((item) => {
    const fullQ = qMap.get(item.questionId);
    const selected = attempt.answers[item.questionId] ?? [];
    const correct = fullQ?.correctOptionIds ?? [];
    const expectedSet = new Set(correct);
    const selectedSet = new Set(selected);
    const isAttempted = selected.length > 0;
    const isCorrect =
      isAttempted &&
      expectedSet.size > 0 &&
      selectedSet.size === expectedSet.size &&
      Array.from(expectedSet).every((id) => selectedSet.has(id));

    let marksAwarded = 0;
    if (isAttempted) {
      if (isCorrect) {
        marksAwarded = item.marks;
      } else if (exam.negativeMarkingEnabled) {
        const penalty =
          item.negativeMarks > 0
            ? item.negativeMarks
            : (exam.negativeMarkingPerQuestion ?? 0);
        marksAwarded = -penalty;
      }
    }

    return {
      questionId: item.questionId,
      questionText: item.questionText,
      subject: item.subject,
      topic: fullQ?.topic ?? "General",
      difficulty: fullQ?.difficulty ?? "medium",
      options: item.options,
      selectedOptionIds: selected,
      correctOptionIds: correct,
      isCorrect,
      isAttempted,
      marksAwarded,
      maxMarks: item.marks,
      explanation: fullQ?.explanation ?? "",
    };
  });

  return { exam, attempt, result, analysis };
}

export async function reviseExamResultMarks(
  actor: SessionUser,
  resultId: string,
  input: { newMarks: number; reason: string }
): Promise<ExamResultRecord> {
  if (!hasStaffPermission(actor, "exams:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing exams:write permission.");
  }
  if (!input.reason || input.reason.trim().length < 5) {
    throw new AuthError(
      400,
      "REASON_REQUIRED",
      "Audit reason (min 5 chars) is required."
    );
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const resRef = examResultsCol().doc(resultId);
  const resSnap = await resRef.get();
  const existing = resSnap.data();
  if (!resSnap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "RESULT_NOT_FOUND", "Result not found.");
  }
  if (input.newMarks < 0 || input.newMarks > existing.maxMarks) {
    throw new AuthError(
      400,
      "INVALID_MARKS",
      "Marks must be within 0 and maximum marks."
    );
  }

  const now = new Date().toISOString();
  const percentage =
    existing.maxMarks > 0
      ? Number(((input.newMarks / existing.maxMarks) * 100).toFixed(2))
      : 0;
  const passed = percentage >= 35;
  const { grade } = computeGradeAndResult(percentage, passed);
  const revId = generateId("REV");

  const revision: ResultRevisionRecord = {
    id: revId,
    instituteId: institute.id,
    examId: existing.examId,
    resultId: existing.id,
    studentId: existing.studentId,
    oldMarks: existing.obtainedMarks,
    newMarks: input.newMarks,
    reason: input.reason.trim(),
    actorUid: actor.uid,
    createdAt: now,
  };

  const updated: ExamResultRecord = {
    ...existing,
    obtainedMarks: input.newMarks,
    percentage,
    grade,
    passed,
    revisionNumber: existing.revisionNumber + 1,
    evaluatedAt: now,
  };

  await Promise.all([resRef.set(updated), resultRevisionsCol().doc(revId).set(revision)]);

  return updated;
}

// ─── STUDENT EXAM PORTAL ──────────────────────────────────────────────────────

async function resolveVerifiedStudent(actor: SessionUser) {
  if (actor.role !== "student" || !actor.studentId || !actor.instituteId) {
    throw new AuthError(403, "FORBIDDEN", "Student authentication required.");
  }
  const [stuSnap, instSnap] = await Promise.all([
    studentsCollection().doc(actor.studentId).get(),
    institutesCollection().doc(actor.instituteId).get(),
  ]);
  const student = stuSnap.data();
  const institute = instSnap.data();
  if (!instSnap.exists || !institute || institute.status !== "active") {
    throw new AuthError(423, "INSTITUTE_SUSPENDED", "Institute is not active.");
  }
  if (!stuSnap.exists || !student || student.instituteId !== actor.instituteId) {
    throw new AuthError(404, "STUDENT_NOT_FOUND", "Student record not found.");
  }
  return { student, institute };
}

export async function listStudentAssignedExams(actor: SessionUser) {
  const { student, institute } = await resolveVerifiedStudent(actor);
  const [examsSnap, attemptsSnap, resultsSnap] = await Promise.all([
    onlineExamsCol().where("instituteId", "==", institute.id).get(),
    examAttemptsCol().where("studentId", "==", student.id).get(),
    examResultsCol().where("studentId", "==", student.id).get(),
  ]);

  const eligibleExams = examsSnap.docs
    .map((d) => d.data())
    .filter(
      (e) =>
        e.status !== "draft" &&
        e.status !== "archived" &&
        (!student.batchId || e.batchIds.includes(student.batchId))
    )
    .sort((a, b) => b.windowStartAt.localeCompare(a.windowStartAt));

  return {
    student,
    exams: eligibleExams,
    attempts: attemptsSnap.docs.map((d) => d.data()),
    declaredResults: resultsSnap.docs
      .map((d) => d.data())
      .filter((r) => r.declared && r.instituteId === institute.id),
  };
}

export async function startStudentExamAttempt(
  actor: SessionUser,
  examId: string
): Promise<ExamAttemptRecord> {
  const { student, institute } = await resolveVerifiedStudent(actor);
  const examSnap = await onlineExamsCol().doc(examId).get();
  const exam = examSnap.data();
  if (!examSnap.exists || !exam || exam.instituteId !== institute.id) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }
  if (exam.status !== "published" && exam.status !== "in_progress") {
    throw new AuthError(
      400,
      "EXAM_NOT_OPEN",
      "This examination is not open for attempts."
    );
  }
  if (student.batchId && !exam.batchIds.includes(student.batchId)) {
    throw new AuthError(403, "NOT_ELIGIBLE", "You are not assigned to this examination.");
  }

  const nowMs = Date.now();
  const winStartMs = Date.parse(exam.windowStartAt);
  const winEndMs = Date.parse(exam.windowEndAt);
  if (nowMs < winStartMs || nowMs > winEndMs) {
    throw new AuthError(
      400,
      "OUTSIDE_EXAM_WINDOW",
      "Current server time is outside the exam availability window."
    );
  }

  const existingSnap = await examAttemptsCol()
    .where("examId", "==", exam.id)
    .where("studentId", "==", student.id)
    .get();
  const existingAttempts = existingSnap.docs.map((d) => d.data());
  const inProgress = existingAttempts.find((a) => a.status === "in_progress");
  if (inProgress) {
    return inProgress;
  }
  if (existingAttempts.length >= exam.allowedAttempts) {
    throw new AuthError(
      400,
      "ATTEMPT_LIMIT_REACHED",
      "Maximum allowed attempts reached for this examination."
    );
  }

  const qSnap = await questionBankCol().where("instituteId", "==", institute.id).get();
  const qMap = new Map(qSnap.docs.map((d) => [d.id, d.data()]));
  const selectedQuestions: QuestionBankRecord[] = exam.questionIds
    .map((qId) => qMap.get(qId))
    .filter((q): q is QuestionBankRecord => Boolean(q && q.status === "active"));

  const snapshot = buildShuffledStudentSnapshot(
    selectedQuestions,
    exam.randomizeQuestions ?? true,
    exam.randomizeOptions ?? true
  );

  if (snapshot.length === 0) {
    throw new AuthError(
      400,
      "NO_QUESTIONS",
      "No active questions are configured for this exam."
    );
  }

  const attemptId = generateId("ATT");
  const startedAt = new Date(nowMs).toISOString();
  const deadlineMs = Math.min(nowMs + exam.durationMinutes * 60 * 1000, winEndMs);
  const deadlineAt = new Date(deadlineMs).toISOString();

  const attempt: ExamAttemptRecord = {
    id: attemptId,
    instituteId: institute.id,
    examId: exam.id,
    examTitle: exam.title,
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.fullName,
    courseName: student.courseName,
    batchId: student.batchId ?? "",
    attemptNumber: existingAttempts.length + 1,
    questionSnapshot: snapshot,
    answers: {},
    markedForReview: [],
    status: "in_progress",
    startedAt,
    deadlineAt,
    submittedAt: null,
    createdAt: startedAt,
    updatedAt: startedAt,
  };

  await examAttemptsCol().doc(attemptId).set(attempt);
  return attempt;
}

export async function autosaveOrSubmitAttempt(
  actor: SessionUser,
  attemptId: string,
  input: {
    action: "autosave" | "submit";
    answers: Record<string, string[]>;
    markedForReview?: string[] | undefined;
  }
) {
  const { student, institute } = await resolveVerifiedStudent(actor);
  const attemptRef = examAttemptsCol().doc(attemptId);
  const attemptSnap = await attemptRef.get();
  const attempt = attemptSnap.data();

  if (
    !attemptSnap.exists ||
    !attempt ||
    attempt.studentId !== student.id ||
    attempt.instituteId !== institute.id
  ) {
    throw new AuthError(404, "ATTEMPT_NOT_FOUND", "Exam attempt not found.");
  }

  if (attempt.status !== "in_progress") {
    return { alreadySubmitted: true, attempt };
  }

  const nowMs = Date.now();
  const deadlineMs = Date.parse(attempt.deadlineAt);
  const expired = nowMs > deadlineMs;
  const mergedAnswers = expired ? attempt.answers : input.answers;
  const nowIso = new Date(nowMs).toISOString();

  if (input.action === "autosave" && !expired) {
    await attemptRef.update({
      answers: mergedAnswers,
      markedForReview: input.markedForReview ?? attempt.markedForReview,
      updatedAt: nowIso,
    });
    return {
      alreadySubmitted: false,
      autoSubmitted: false,
      savedAt: nowIso,
    };
  }

  // Finalize & grade server-side inside an atomic transaction to prevent duplicate submissions
  const examSnap = await onlineExamsCol().doc(attempt.examId).get();
  const exam = examSnap.data();
  if (!exam) {
    throw new AuthError(404, "EXAM_NOT_FOUND", "Examination not found.");
  }

  const qSnap = await questionBankCol().where("instituteId", "==", institute.id).get();
  const answerKeys = new Map<string, string[]>();
  for (const doc of qSnap.docs) {
    answerKeys.set(doc.id, doc.data().correctOptionIds);
  }

  const graded = gradeMcqAttempt({
    snapshot: attempt.questionSnapshot,
    answerKeyByQuestionId: answerKeys,
    submittedAnswers: mergedAnswers,
    negativeMarkingEnabled: exam.negativeMarkingEnabled,
    negativeMarkingPerQuestion: exam.negativeMarkingPerQuestion,
    maxMarks: exam.maxMarks,
    passingMarks: exam.passingMarks,
  });

  const finalStatus = expired ? "auto_submitted" : "submitted";
  const timeTakenSeconds = Math.max(
    0,
    Math.round((nowMs - Date.parse(attempt.startedAt)) / 1000)
  );
  const resultId = `ERS_${attempt.id}`;

  const resultRecord: ExamResultRecord = {
    id: resultId,
    instituteId: institute.id,
    examId: exam.id,
    examTitle: exam.title,
    attemptId: attempt.id,
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.fullName,
    courseName: student.courseName,
    batchId: attempt.batchId,
    correctCount: graded.correctCount,
    incorrectCount: graded.incorrectCount,
    unansweredCount: graded.unansweredCount,
    attemptedCount: graded.attemptedCount,
    obtainedMarks: graded.obtainedMarks,
    maxMarks: exam.maxMarks,
    percentage: graded.percentage,
    grade: graded.grade,
    passed: graded.passed,
    timeTakenSeconds,
    submittedAt: nowIso,
    evaluationStatus: "evaluated",
    gradingVersion: 1,
    declared: exam.status === "results_declared",
    declaredAt: exam.status === "results_declared" ? nowIso : null,
    declaredByUid: null,
    revisionNumber: 1,
    evaluatedAt: nowIso,
  };

  const db = getAdminFirestore();
  const txOutcome = await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(attemptRef);
    const fresh = freshSnap.data();
    if (!freshSnap.exists || !fresh || fresh.status !== "in_progress") {
      return { alreadySubmitted: true as const, attempt: fresh ?? attempt };
    }
    tx.update(attemptRef, {
      answers: mergedAnswers,
      markedForReview: input.markedForReview ?? attempt.markedForReview,
      status: finalStatus,
      submittedAt: nowIso,
      updatedAt: nowIso,
    });
    tx.set(examResultsCol().doc(resultId), resultRecord);
    return { alreadySubmitted: false as const };
  });

  if (txOutcome.alreadySubmitted) {
    return { alreadySubmitted: true, attempt: txOutcome.attempt };
  }

  return {
    alreadySubmitted: false,
    autoSubmitted: expired,
    submittedAt: nowIso,
    resultId,
  };
}
