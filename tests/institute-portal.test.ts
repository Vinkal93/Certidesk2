import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, Map<string, Record<string, unknown>>>();

function getCol(name: string) {
  let col = store.get(name);
  if (!col) {
    col = new Map();
    store.set(name, col);
  }
  return col;
}

function makeDocRef(colName: string, id: string) {
  return {
    id,
    get: async () => {
      const data = getCol(colName).get(id);
      return {
        exists: Boolean(data),
        data: () => (data ? structuredClone(data) : undefined),
      };
    },
    set: async (data: Record<string, unknown>) => {
      getCol(colName).set(id, structuredClone(data));
    },
    update: async (patch: Record<string, unknown>) => {
      const existing = getCol(colName).get(id) ?? {};
      getCol(colName).set(id, { ...existing, ...structuredClone(patch) });
    },
  };
}

function makeColProxy(colName: string) {
  return {
    doc: (id: string) => makeDocRef(colName, id),
    where: (field: string, _op: string, value: unknown) => ({
      limit: () => ({
        get: async () => ({
          docs: Array.from(getCol(colName).entries())
            .filter(([, d]) => d[field] === value)
            .map(([id, data]) => ({
              id,
              ref: makeDocRef(colName, id),
              data: () => structuredClone(data),
            })),
        }),
      }),
      orderBy: () => ({
        get: async () => ({
          docs: Array.from(getCol(colName).entries())
            .filter(([, d]) => d[field] === value)
            .map(([id, data]) => ({
              id,
              ref: makeDocRef(colName, id),
              data: () => structuredClone(data),
            })),
        }),
        limit: () => ({
          get: async () => ({
            docs: Array.from(getCol(colName).entries())
              .filter(([, d]) => d[field] === value)
              .map(([id, data]) => ({
                id,
                ref: makeDocRef(colName, id),
                data: () => structuredClone(data),
              })),
          }),
        }),
      }),
    }),
  };
}

vi.mock("server-only", () => ({}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => makeColProxy(name),
    batch: () => {
      const ops: (() => Promise<void>)[] = [];
      return {
        update: (ref: ReturnType<typeof makeDocRef>, patch: Record<string, unknown>) => {
          ops.push(() => ref.update(patch));
        },
        commit: async () => {
          for (const op of ops) await op();
        },
      };
    },
    runTransaction: async <T>(
      fn: (tx: {
        get: (ref: ReturnType<typeof makeDocRef>) => Promise<{
          exists: boolean;
          data: () => Record<string, unknown> | undefined;
        }>;
        set: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => void;
        update: (
          ref: ReturnType<typeof makeDocRef>,
          patch: Record<string, unknown>
        ) => void;
      }) => Promise<T>
    ) => {
      const ops: (() => Promise<void>)[] = [];
      const tx = {
        get: (ref: ReturnType<typeof makeDocRef>) => ref.get(),
        set: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => {
          ops.push(() => ref.set(data));
        },
        update: (ref: ReturnType<typeof makeDocRef>, patch: Record<string, unknown>) => {
          ops.push(() => ref.update(patch));
        },
      };
      const res = await fn(tx);
      for (const op of ops) await op();
      return res;
    },
  }),
}));

vi.mock("@/lib/firebase/firestore", () => ({
  institutesCollection: () => makeColProxy("institutes"),
  studentsCollection: () => makeColProxy("students"),
  usersCollection: () => makeColProxy("users"),
  auditLogsCollection: () => makeColProxy("audit_logs"),
  walletTransactionsCollection: () => makeColProxy("wallet_transactions"),
}));

import { createCourse } from "@/services/academic.service";
import { markBatchAttendance } from "@/services/attendance.service";
import { collectStudentFeePayment, createStudentFeePlan } from "@/services/fee.service";
import {
  computeGradeAndResult,
  createExamination,
  saveStudentExamMarks,
} from "@/services/exam.service";
import {
  getCertificateByVerificationId,
  issueCertificate,
  revokeCertificate,
} from "@/services/certificate.service";
import { dispatchInstituteNotification } from "@/services/institute-ops.service";
import type { SessionUser } from "@/types/auth";

const instAdminA: SessionUser = {
  uid: "admin_a",
  email: "admin@alpha.edu",
  role: "institute_admin",
  instituteId: "INST_A",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

const instAdminB: SessionUser = {
  uid: "admin_b",
  email: "admin@beta.edu",
  role: "institute_admin",
  instituteId: "INST_B",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

const teacherReadOnly: SessionUser = {
  uid: "staff_1",
  email: "teacher@alpha.edu",
  role: "staff",
  instituteId: "INST_A",
  studentId: null,
  permissions: ["attendance:read", "attendance:write"],
  mustChangePassword: false,
};

describe("Institute Admin Portal — Functional & Security Integration", () => {
  beforeEach(() => {
    store.clear();
    getCol("institutes").set("INST_A", {
      id: "INST_A",
      code: "INS-ALPH-0001",
      name: "Alpha Institute",
      ownerName: "Owner A",
      status: "active",
      walletBalancePaise: 50000,
      pricing: {
        admissionFeePaise: 15000,
        profileUpdateFeePaise: 10000,
        certificateFeePaise: 0,
      },
    });
    getCol("institutes").set("INST_B", {
      id: "INST_B",
      code: "INS-BETA-0002",
      name: "Beta Institute",
      ownerName: "Owner B",
      status: "active",
      walletBalancePaise: 50000,
      pricing: {
        admissionFeePaise: 15000,
        profileUpdateFeePaise: 10000,
        certificateFeePaise: 0,
      },
    });
    getCol("students").set("STU_A", {
      id: "STU_A",
      studentCode: "STU-ALPH-01",
      instituteId: "INST_A",
      fullName: "Ananya Iyer",
      courseName: "Python",
      batchName: "Batch A",
      status: "active",
    });
  });

  it("prevents duplicate attendance records for the same student, batch, and date", async () => {
    const first = await markBatchAttendance(teacherReadOnly, {
      batchId: "BAT_1",
      batchName: "Batch A",
      date: "2026-11-26",
      entries: [{ studentId: "STU_A", status: "present" }],
    });
    expect(first).toEqual({ savedCount: 1, updatedCount: 0 });

    const second = await markBatchAttendance(teacherReadOnly, {
      batchId: "BAT_1",
      batchName: "Batch A",
      date: "2026-11-26",
      entries: [{ studentId: "STU_A", status: "absent" }],
    });
    expect(second).toEqual({ savedCount: 0, updatedCount: 1 });
    expect(getCol("attendance_records").size).toBe(1);
    expect(
      getCol("attendance_records").get("INST_A_BAT_1_STU_A_2026-11-26")?.status
    ).toBe("absent");
  });

  it("enforces staff permissions and blocks unauthorized modules", async () => {
    await expect(
      createCourse(teacherReadOnly, {
        name: "Python",
        code: "PY",
        duration: "3 Months",
        feeRupees: 5000,
        description: "",
        subjects: [],
        status: "active",
      })
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("creates student fee plan, collects partial payments, and prevents overpayment", async () => {
    const plan = await createStudentFeePlan(instAdminA, {
      studentId: "STU_A",
      totalFeeRupees: 10000,
      discountRupees: 1000,
    });
    expect(plan.pendingPaise).toBe(900000);

    const payment = await collectStudentFeePayment(instAdminA, {
      feePlanId: plan.id,
      amountRupees: 4000,
      paymentMode: "upi",
      note: "First installment",
    });
    expect(payment.plan.paidPaise).toBe(400000);
    expect(payment.plan.pendingPaise).toBe(500000);

    await expect(
      collectStudentFeePayment(instAdminA, {
        feePlanId: plan.id,
        amountRupees: 6000,
        paymentMode: "cash",
        note: "Overpay",
      })
    ).rejects.toMatchObject({ status: 400, code: "OVERPAYMENT" });
  });

  it("computes exam grades accurately and blocks cross-tenant exam access", async () => {
    expect(computeGradeAndResult(92, true)).toEqual({ grade: "A+", result: "PASS" });
    expect(computeGradeAndResult(75, false)).toEqual({ grade: "F", result: "FAIL" });

    const exam = await createExamination(instAdminA, {
      title: "Final Exam",
      batchId: "BAT_1",
      batchName: "Batch A",
      examDate: "2026-12-01",
      subjects: [
        { id: "s1", name: "Theory", maxMarks: 80, passingMarks: 28 },
        { id: "s2", name: "Practical", maxMarks: 20, passingMarks: 8 },
      ],
    });

    const ms = await saveStudentExamMarks(instAdminA, {
      examId: exam.id,
      studentId: "STU_A",
      marks: [
        { subjectId: "s1", obtainedMarks: 72 },
        { subjectId: "s2", obtainedMarks: 18 },
      ],
    });
    expect(ms.percentage).toBe(90);
    expect(ms.grade).toBe("A+");
    expect(ms.result).toBe("PASS");

    await expect(
      saveStudentExamMarks(instAdminB, {
        examId: exam.id,
        studentId: "STU_A",
        marks: [],
      })
    ).rejects.toMatchObject({ status: 404, code: "EXAM_NOT_FOUND" });
  });

  it("issues, verifies publicly, and revokes certificates", async () => {
    const cert = await issueCertificate(instAdminA, {
      studentId: "STU_A",
      templateId: "modern",
      grade: "A+",
    });
    const verified = await getCertificateByVerificationId(cert.verificationId);
    expect(verified?.status).toBe("issued");

    const revoked = await revokeCertificate(instAdminA, cert.id, "Correction needed");
    expect(revoked.status).toBe("revoked");
  });

  it("blocks sending WhatsApp/SMS through unconfigured providers", async () => {
    await expect(
      dispatchInstituteNotification(instAdminA, {
        channel: "whatsapp",
        category: "fee_reminder",
        recipientCount: 10,
        message: "Fee due reminder",
      })
    ).rejects.toMatchObject({ status: 503, code: "PROVIDER_NOT_CONFIGURED" });
  });
});
