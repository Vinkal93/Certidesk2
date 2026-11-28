import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({}),
}));

import {
  buildShuffledStudentSnapshot,
  gradeMcqAttempt,
  selectUniqueRandomQuestions,
} from "@/services/online-exam.service";
import {
  doesFeeReminderTriggerMatch,
  doesStudentMatchRuleTargets,
  getDatePartsInTimezone,
  renderFeeReminderTemplate,
} from "@/services/fee-reminder.service";
import type { QuestionBankRecord } from "@/types/online-exam";

function makeCccPool(count: number): QuestionBankRecord[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `Q_CCC_${idx + 1}`,
    instituteId: "INST_1",
    questionText: `CCC Question #${idx + 1}`,
    questionType: "single_mcq",
    subject: "CCC Fundamentals",
    topic: "Digital Literacy",
    courseName: "CCC",
    difficulty: idx % 3 === 0 ? "easy" : idx % 3 === 1 ? "medium" : "hard",
    options: [
      { id: "A", text: `Option A for ${idx + 1}` },
      { id: "B", text: `Option B for ${idx + 1}` },
      { id: "C", text: `Option C for ${idx + 1}` },
      { id: "D", text: `Option D for ${idx + 1}` },
    ],
    correctOptionIds: ["B"],
    marks: 1,
    negativeMarks: 0.25,
    explanation: `Explanation for Q${idx + 1}`,
    status: "active",
    createdBy: "admin_1",
    createdAt: "2026-11-28T00:00:00.000Z",
    updatedAt: "2026-11-28T00:00:00.000Z",
  }));
}

describe("Module 1: Smart Automatic Online Examination", () => {
  it("selects 100 unique random questions from a 1,000-question CCC pool", () => {
    const pool = makeCccPool(1000);
    const selected = selectUniqueRandomQuestions(pool, 100);
    expect(selected).toHaveLength(100);
    const uniqueIds = new Set(selected.map((q) => q.id));
    expect(uniqueIds.size).toBe(100);
    for (const q of selected) {
      expect(q.courseName).toBe("CCC");
    }
  });

  it("gives every student the EXACT SAME 100 questions in different shuffled sequences while preserving option answer mapping", () => {
    const pool = makeCccPool(1000);
    const frozen100 = selectUniqueRandomQuestions(pool, 100);
    const frozenIds = new Set(frozen100.map((q) => q.id));

    const snapA = buildShuffledStudentSnapshot(frozen100, true, true);
    const snapB = buildShuffledStudentSnapshot(frozen100, true, true);
    const snapC = buildShuffledStudentSnapshot(frozen100, true, true);

    expect(snapA).toHaveLength(100);
    expect(snapB).toHaveLength(100);
    expect(snapC).toHaveLength(100);

    // Same exact question set for all 3 students
    expect(new Set(snapA.map((q) => q.questionId))).toEqual(frozenIds);
    expect(new Set(snapB.map((q) => q.questionId))).toEqual(frozenIds);
    expect(new Set(snapC.map((q) => q.questionId))).toEqual(frozenIds);

    // Different sequence orders
    const orderA = snapA.map((q) => q.questionId).join(",");
    const orderB = snapB.map((q) => q.questionId).join(",");
    const orderC = snapC.map((q) => q.questionId).join(",");
    expect(orderA === orderB && orderB === orderC).toBe(false);

    // Option shuffling preserves option IDs so server grading remains 100% accurate
    const answerKey = new Map(frozen100.map((q) => [q.id, q.correctOptionIds]));
    const studentAnswers: Record<string, string[]> = {};
    for (const q of snapA) {
      // Student selects option with id "B" regardless of its visual shuffled position
      const optB = q.options.find((o) => o.id === "B");
      expect(optB).toBeDefined();
      studentAnswers[q.questionId] = [optB!.id];
    }

    const graded = gradeMcqAttempt({
      snapshot: snapA,
      answerKeyByQuestionId: answerKey,
      submittedAnswers: studentAnswers,
      negativeMarkingEnabled: true,
      maxMarks: 100,
      passingMarks: 35,
    });
    expect(graded.correctCount).toBe(100);
    expect(graded.incorrectCount).toBe(0);
    expect(graded.obtainedMarks).toBe(100);
    expect(graded.passed).toBe(true);
  });

  it("applies negative marking and tracks unanswered questions accurately", () => {
    const pool = makeCccPool(10);
    const snap = buildShuffledStudentSnapshot(pool, false, false);
    const answerKey = new Map(pool.map((q) => [q.id, q.correctOptionIds]));

    const graded = gradeMcqAttempt({
      snapshot: snap,
      answerKeyByQuestionId: answerKey,
      submittedAnswers: {
        [snap[0]!.questionId]: ["B"], // +1
        [snap[1]!.questionId]: ["B"], // +1
        [snap[2]!.questionId]: ["A"], // -0.25
        [snap[3]!.questionId]: ["C"], // -0.25
      },
      negativeMarkingEnabled: true,
      maxMarks: 10,
      passingMarks: 2,
    });

    expect(graded.correctCount).toBe(2);
    expect(graded.incorrectCount).toBe(2);
    expect(graded.unansweredCount).toBe(6);
    expect(graded.attemptedCount).toBe(4);
    expect(graded.obtainedMarks).toBe(1.5);
    expect(graded.passed).toBe(false);
  });
});

describe("Module 2: Automated Fee Reminder Rule Engine", () => {
  it("evaluates before_due_date, on_due_date, after_due_date, specific_day, between_dates, and specific_calendar_date", () => {
    const dueDate = "2026-12-10";
    const dec5 = getDatePartsInTimezone(
      new Date("2026-12-05T10:00:00+05:30"),
      "Asia/Kolkata"
    );
    const dec10 = getDatePartsInTimezone(
      new Date("2026-12-10T10:00:00+05:30"),
      "Asia/Kolkata"
    );
    const dec15 = getDatePartsInTimezone(
      new Date("2026-12-15T10:00:00+05:30"),
      "Asia/Kolkata"
    );

    // 5 days before due date
    expect(
      doesFeeReminderTriggerMatch(
        { triggerType: "before_due_date", offsetDays: 5, active: true },
        dec5,
        dueDate
      )
    ).toBe(true);
    expect(
      doesFeeReminderTriggerMatch(
        { triggerType: "before_due_date", offsetDays: 5, active: true },
        dec15,
        dueDate
      )
    ).toBe(false);

    // On due date
    expect(
      doesFeeReminderTriggerMatch(
        { triggerType: "on_due_date", active: true },
        dec10,
        dueDate
      )
    ).toBe(true);

    // After due date (overdue)
    expect(
      doesFeeReminderTriggerMatch(
        { triggerType: "after_due_date", offsetDays: 1, active: true },
        dec15,
        dueDate
      )
    ).toBe(true);

    // Specific day of every month (5th)
    expect(
      doesFeeReminderTriggerMatch(
        { triggerType: "specific_day_of_month", dayOfMonth: 5, active: true },
        dec5,
        dueDate
      )
    ).toBe(true);

    // Between 5th and 10th
    expect(
      doesFeeReminderTriggerMatch(
        { triggerType: "between_dates", rangeStartDay: 5, rangeEndDay: 10, active: true },
        dec5,
        dueDate
      )
    ).toBe(true);
    expect(
      doesFeeReminderTriggerMatch(
        { triggerType: "between_dates", rangeStartDay: 5, rangeEndDay: 10, active: true },
        dec15,
        dueDate
      )
    ).toBe(false);

    // Specific calendar date (15 December)
    expect(
      doesFeeReminderTriggerMatch(
        {
          triggerType: "specific_calendar_date",
          specificDate: "2026-12-15",
          active: true,
        },
        dec15,
        dueDate
      )
    ).toBe(true);
  });

  it("matches eligible students only and stops matching once fee is paid (pending = 0)", () => {
    const rule = {
      targetAudience: "specific_courses" as const,
      courseIds: ["CRS_ADCA"],
      batchIds: [],
      feeStatusFilters: ["overdue" as const],
      targetLogic: "AND" as const,
    };

    expect(
      doesStudentMatchRuleTargets(
        rule,
        { courseId: "CRS_ADCA", batchId: "BAT_1" },
        { overduePaise: 50000, dueThisMonthPaise: 0, upcomingPaise: 0 },
        50000
      )
    ).toBe(true);

    // Different course fails AND condition
    expect(
      doesStudentMatchRuleTargets(
        rule,
        { courseId: "CRS_CCC", batchId: "BAT_2" },
        { overduePaise: 50000, dueThisMonthPaise: 0, upcomingPaise: 0 },
        50000
      )
    ).toBe(false);

    // Paid in full (totalPendingPaise = 0) never matches
    expect(
      doesStudentMatchRuleTargets(
        rule,
        { courseId: "CRS_ADCA", batchId: "BAT_1" },
        { overduePaise: 0, dueThisMonthPaise: 0, upcomingPaise: 0 },
        0
      )
    ).toBe(false);
  });

  it("renders dynamic placeholders in reminder templates", () => {
    const rendered = renderFeeReminderTemplate(
      "Dear {student_name}, your {course_name} fee for {month} of ₹{pending_amount} (paid ₹{paid_amount}) at {institute_name} is due by {due_date}.",
      {
        studentName: "Rajan Singh",
        instituteName: "SBCI Institute",
        courseName: "ADCA",
        pendingAmountRupees: "1500",
        dueDate: "2026-12-10",
        paidAmountRupees: "3000",
        month: "Dec 2026",
      }
    );
    expect(rendered).toBe(
      "Dear Rajan Singh, your ADCA fee for Dec 2026 of ₹1500 (paid ₹3000) at SBCI Institute is due by 2026-12-10."
    );
  });
});
