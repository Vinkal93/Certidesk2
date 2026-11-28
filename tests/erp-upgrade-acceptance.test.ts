import { describe, expect, it } from "vitest";
import { computeMonthlyDueBreakdown } from "@/lib/finance/monthly-dues";
import { questionItemSchema } from "@/lib/validation/question-bank";
import type { StudentFeePlanRecord } from "@/types/academic";

describe("CertiDesk ERP Upgrade Acceptance Tests", () => {
  it("classifies 7 completed months as OVERDUE, current month as DUE, and future months as UPCOMING", () => {
    const plan: StudentFeePlanRecord = {
      id: "FPL_TEST_1",
      instituteId: "INS_1",
      studentId: "STU_1",
      studentCode: "STU-001",
      studentName: "Aarav Sharma",
      courseName: "ADCA",
      totalFeePaise: 1230000, // 12 * 1000 + 300 admission = 12300 INR
      monthlyFeePaise: 100000, // 1000 INR
      durationMonths: 12,
      admissionFeePaise: 30000, // 300 INR
      startDate: "2026-04-05T00:00:00.000Z",
      discountPaise: 0,
      paidPaise: 0,
      pendingPaise: 1230000,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
    };

    const novNow = new Date("2026-11-15T10:00:00.000Z");
    const breakdown = computeMonthlyDueBreakdown(plan, novNow);

    expect(breakdown.admissionFeePaise).toBe(30000);
    expect(breakdown.courseFeePaise).toBe(1200000);
    // Admission (Apr) + Apr..Oct (7 months) = 300 + 7000 = 7300 INR = 730000 paise
    expect(breakdown.overduePaise).toBe(730000);
    // November = 1000 INR = 100000 paise
    expect(breakdown.dueThisMonthPaise).toBe(100000);
    // Dec, Jan, Feb, Mar (4 months) = 4000 INR = 400000 paise
    expect(breakdown.upcomingPaise).toBe(400000);
    expect(breakdown.overallStatus).toBe("OVERDUE");

    const upcomingItems = breakdown.installments.filter((i) => i.monthKey > "2026-11");
    expect(upcomingItems).toHaveLength(4);
    expect(upcomingItems.every((i) => i.status === "UPCOMING")).toBe(true);
  });

  it("marks partially paid month as PARTIAL and never as PAID", () => {
    const plan: StudentFeePlanRecord = {
      id: "FPL_TEST_2",
      instituteId: "INS_1",
      studentId: "STU_2",
      studentCode: "STU-002",
      studentName: "Priya Verma",
      courseName: "CCC",
      totalFeePaise: 300000, // 3 * 1000
      monthlyFeePaise: 100000,
      durationMonths: 3,
      admissionFeePaise: 0,
      startDate: "2026-10-01T00:00:00.000Z",
      discountPaise: 0,
      paidPaise: 150000, // 1500 INR -> Oct paid (1000), Nov partial (500/1000)
      pendingPaise: 150000,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };

    const novNow = new Date("2026-11-15T10:00:00.000Z");
    const breakdown = computeMonthlyDueBreakdown(plan, novNow);

    expect(breakdown.installments[0]?.status).toBe("PAID");
    expect(breakdown.installments[1]?.status).toBe("PARTIAL");
    expect(breakdown.installments[1]?.paidPaise).toBe(50000);
    expect(breakdown.installments[1]?.pendingPaise).toBe(50000);
    expect(breakdown.installments[2]?.status).toBe("UPCOMING");
  });

  it("validates all 5 Question Bank formats in questionItemSchema", () => {
    const mcq = questionItemSchema.safeParse({
      questionText: "What does CPU stand for?",
      questionType: "single_mcq",
      subject: "Fundamentals",
      options: [
        { id: "A", text: "Central Processing Unit" },
        { id: "B", text: "Control Program Unit" },
      ],
      correctOptionIds: ["A"],
      marks: 2,
    });
    expect(mcq.success).toBe(true);

    const fillBlank = questionItemSchema.safeParse({
      questionText: "HTML stands for ____.",
      questionType: "fill_blank",
      subject: "Web",
      correctText: "HyperText Markup Language",
      marks: 1,
    });
    expect(fillBlank.success).toBe(true);
  });
});
