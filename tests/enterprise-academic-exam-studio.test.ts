import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({}),
}));

import { validateCourseAndBatchRelationship } from "@/services/academic.service";
import {
  gradeMcqAttempt,
  listStudentAssignedExams,
} from "@/services/online-exam.service";
import {
  renderCertificatePdfBuffer,
  renderMarksheetPdfBuffer,
  resolveApprovedPlaceholders,
} from "@/lib/pdf/renderer";
import {
  buildDefaultCertificateTemplate,
  buildDefaultMarksheetTemplate,
  saveCertificateTemplate,
  saveMarksheetTemplate,
} from "@/services/template-studio.service";
import type { SessionUser } from "@/types/auth";
import type { BatchRecord, CourseRecord } from "@/types/academic";

const instAdmin: SessionUser = {
  uid: "inst_1",
  email: "admin@inst.edu",
  role: "institute_admin",
  instituteId: "INST_1",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

const activeCourse: CourseRecord = {
  id: "CRS_1",
  instituteId: "INST_1",
  name: "Diploma in Python",
  code: "DPY",
  duration: "6 Months",
  feePaise: 1200000,
  description: "",
  subjects: [],
  status: "active",
  createdAt: "2026-11-27T00:00:00.000Z",
  updatedAt: "2026-11-27T00:00:00.000Z",
};

const activeBatch: BatchRecord = {
  id: "BAT_1",
  instituteId: "INST_1",
  name: "Morning A",
  courseId: "CRS_1",
  courseName: "Diploma in Python",
  timing: "9:00 AM - 11:00 AM",
  teacherUid: null,
  teacherName: null,
  capacity: 30,
  enrolledCount: 10,
  status: "active",
  createdAt: "2026-11-27T00:00:00.000Z",
  updatedAt: "2026-11-27T00:00:00.000Z",
};

describe("Academic, Online Exam, Studio & PDF Pipeline", () => {
  it("enforces course-batch relationship, status, tenant isolation, and capacity", () => {
    const valid = validateCourseAndBatchRelationship({
      instituteId: "INST_1",
      course: activeCourse,
      batch: activeBatch,
    });
    expect(valid.course.id).toBe("CRS_1");
    expect(valid.batch.id).toBe("BAT_1");

    expect(() =>
      validateCourseAndBatchRelationship({
        instituteId: "INST_OTHER",
        course: activeCourse,
        batch: activeBatch,
      })
    ).toThrow(/not found/i);

    expect(() =>
      validateCourseAndBatchRelationship({
        instituteId: "INST_1",
        course: { ...activeCourse, status: "inactive" },
        batch: activeBatch,
      })
    ).toThrow(/not active/i);

    expect(() =>
      validateCourseAndBatchRelationship({
        instituteId: "INST_1",
        course: activeCourse,
        batch: { ...activeBatch, courseId: "CRS_OTHER" },
      })
    ).toThrow(/does not belong/i);

    expect(() =>
      validateCourseAndBatchRelationship({
        instituteId: "INST_1",
        course: activeCourse,
        batch: { ...activeBatch, enrolledCount: 30, capacity: 30 },
      })
    ).toThrow(/capacity/i);
  });

  it("grades MCQ attempts server-side with negative marking and ignores tampered option IDs", () => {
    const snapshot = [
      {
        questionId: "Q1",
        questionText: "2+2?",
        questionType: "single_mcq" as const,
        subject: "Math",
        options: [
          { id: "A", text: "3" },
          { id: "B", text: "4" },
        ],
        marks: 4,
        negativeMarks: 1,
      },
      {
        questionId: "Q2",
        questionText: "Python is?",
        questionType: "single_mcq" as const,
        subject: "Python",
        options: [
          { id: "A", text: "Interpreted" },
          { id: "B", text: "Hardware" },
        ],
        marks: 4,
        negativeMarks: 1,
      },
    ];

    const answerKeys = new Map<string, string[]>([
      ["Q1", ["B"]],
      ["Q2", ["A"]],
    ]);

    const graded = gradeMcqAttempt({
      snapshot,
      answerKeyByQuestionId: answerKeys,
      submittedAnswers: {
        Q1: ["B"],
        Q2: ["B"],
      },
      negativeMarkingEnabled: true,
      maxMarks: 8,
      passingMarks: 3,
    });

    expect(graded.correctCount).toBe(1);
    expect(graded.incorrectCount).toBe(1);
    expect(graded.obtainedMarks).toBe(3);
    expect(graded.passed).toBe(true);

    const tampered = gradeMcqAttempt({
      snapshot,
      answerKeyByQuestionId: answerKeys,
      submittedAnswers: {
        Q1: ["FAKE_OPTION"],
      },
      negativeMarkingEnabled: true,
      maxMarks: 8,
      passingMarks: 3,
    });
    expect(tampered.unansweredCount).toBe(2);
    expect(tampered.obtainedMarks).toBe(0);
  });

  it("resolves only approved placeholders and generates valid A4 vector PDFs", async () => {
    const resolved = resolveApprovedPlaceholders(
      "Awarded to {{student_name}} for {{course_name}} {{secret_db_path}}",
      {
        student_name: "Ananya Iyer",
        course_name: "Diploma in Python",
      }
    );
    expect(resolved).toBe("Awarded to Ananya Iyer for Diploma in Python ");

    const certPdf = await renderCertificatePdfBuffer({
      template: buildDefaultCertificateTemplate(),
      placeholders: {
        student_name: "Ananya Iyer",
        course_name: "Diploma in Python",
        institute_name: "Apex Institute",
        certificate_number: "CERT-2026-AABBCC",
        issue_date: "2026-11-27",
        grade: "A+",
      },
      verifyUrl: "https://certidesk.sbci.online/verify/VER-1234",
    });
    expect(Buffer.from(certPdf.slice(0, 5)).toString("ascii")).toBe("%PDF-");

    const marksheetPdf = await renderMarksheetPdfBuffer({
      template: buildDefaultMarksheetTemplate(),
      instituteName: "Apex Institute",
      verifyUrl: "https://certidesk.sbci.online/verify/MKS_1",
      marksheet: {
        id: "MKS_1",
        instituteId: "INST_1",
        examId: "EXM_1",
        examTitle: "Mid Term",
        studentId: "STU_1",
        studentCode: "STU-001",
        studentName: "Ananya Iyer",
        batchName: "Morning A",
        marks: [
          {
            subjectId: "S1",
            subjectName: "Python Core",
            maxMarks: 100,
            obtainedMarks: 92,
          },
        ],
        totalMax: 100,
        totalObtained: 92,
        percentage: 92,
        grade: "A+",
        result: "PASS",
        published: true,
        updatedByUid: "inst_1",
        createdAt: "2026-11-27T00:00:00.000Z",
        updatedAt: "2026-11-27T00:00:00.000Z",
      },
    });
    expect(Buffer.from(marksheetPdf.slice(0, 5)).toString("ascii")).toBe("%PDF-");
  });

  it("enforces Super Admin template authorization and Student exam ownership", async () => {
    await expect(
      saveCertificateTemplate(instAdmin, { name: "Unauthorized" })
    ).rejects.toThrow(/Super Admin authorization required/i);

    await expect(
      saveMarksheetTemplate(instAdmin, { name: "Unauthorized" })
    ).rejects.toThrow(/Super Admin authorization required/i);

    await expect(listStudentAssignedExams(instAdmin)).rejects.toThrow(
      /Student authentication required/i
    );
  });

  it("locks all academic, exam, and template collections to server-only writes in firestore.rules", () => {
    const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf8");
    for (const col of [
      "studentBatchTransfers",
      "questionBank",
      "onlineExams",
      "examAttempts",
      "examResults",
      "resultRevisions",
      "certificateTemplates",
      "marksheetTemplates",
    ]) {
      const idx = rules.indexOf(`match /${col}/`);
      expect(idx).toBeGreaterThan(-1);
      expect(rules.slice(idx, idx + 420)).toContain("allow write: if false;");
    }
  });
});
