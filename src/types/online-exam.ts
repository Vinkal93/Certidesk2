export type QuestionType =
  "single_mcq" | "multi_mcq" | "true_false" | "fill_blank" | "short_answer";
export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionBankRecord {
  id: string;
  instituteId: string;
  questionText: string;
  imageUrl?: string;
  questionType: QuestionType;
  subject: string;
  topic: string;
  courseName?: string;
  language?: string;
  difficulty: QuestionDifficulty;
  options: QuestionOption[];
  correctOptionIds: string[];
  correctText?: string;
  marks: number;
  negativeMarks: number;
  explanation: string;
  status: "active" | "archived" | "deleted";
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type OnlineExamStatus =
  | "draft"
  | "ready_for_review"
  | "scheduled"
  | "published"
  | "in_progress"
  | "closed"
  | "evaluation_pending"
  | "results_ready"
  | "results_declared"
  | "archived";

export interface OnlineExamRecord {
  id: string;
  instituteId: string;
  title: string;
  code: string;
  description: string;
  courseId: string;
  courseName: string;
  batchIds: string[];
  examType: "mcq" | "mixed";
  instructions: string;
  maxMarks: number;
  passingMarks: number;
  durationMinutes: number;
  windowStartAt: string;
  windowEndAt: string;
  timezone: string;
  allowedAttempts: number;
  questionIds: string[];
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  negativeMarkingEnabled: boolean;
  status: OnlineExamStatus;
  resultsDeclaredAt: string | null;
  resultsDeclaredByUid: string | null;
  resultVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestionSnapshotItem {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  subject: string;
  options: QuestionOption[];
  marks: number;
  negativeMarks: number;
}

export interface ExamAttemptRecord {
  id: string;
  instituteId: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  courseName: string;
  batchId: string;
  attemptNumber: number;
  questionSnapshot: ExamQuestionSnapshotItem[];
  answers: Record<string, string[]>;
  markedForReview: string[];
  status: "in_progress" | "submitted" | "auto_submitted" | "evaluated";
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamResultRecord {
  id: string;
  instituteId: string;
  examId: string;
  examTitle: string;
  attemptId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  courseName: string;
  batchId: string;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  obtainedMarks: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  evaluationStatus: "evaluated" | "pending_review";
  gradingVersion: number;
  declared: boolean;
  declaredAt: string | null;
  declaredByUid: string | null;
  revisionNumber: number;
  evaluatedAt: string;
}

export interface ResultRevisionRecord {
  id: string;
  instituteId: string;
  examId: string;
  resultId: string;
  studentId: string;
  oldMarks: number;
  newMarks: number;
  reason: string;
  actorUid: string;
  createdAt: string;
}
