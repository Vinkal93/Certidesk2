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
  };
}

function makeQuery(colName: string, filters: { field: string; value: unknown }[] = []) {
  return {
    where: (field: string, _op: string, value: unknown) =>
      makeQuery(colName, [...filters, { field, value }]),
    orderBy: () => makeQuery(colName, filters),
    limit: () => makeQuery(colName, filters),
    get: async () => ({
      docs: Array.from(getCol(colName).entries())
        .filter(([, d]) => filters.every((f) => d[f.field] === f.value))
        .map(([id, data]) => ({
          id,
          data: () => structuredClone(data),
        })),
    }),
  };
}

vi.mock("server-only", () => ({}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => makeDocRef(name, id),
      where: (field: string, op: string, value: unknown) =>
        makeQuery(name).where(field, op, value),
    }),
  }),
}));

vi.mock("@/lib/firebase/firestore", () => ({
  institutesCollection: () => ({
    doc: (id: string) => makeDocRef("institutes", id),
  }),
  studentsCollection: () => ({
    doc: (id: string) => makeDocRef("students", id),
  }),
}));

import {
  getStudentExamsAndResults,
  getStudentNotifications,
  getStudentPortalContext,
  markStudentNotificationRead,
} from "@/services/student-portal.service";
import type { SessionUser } from "@/types/auth";

const studentA: SessionUser = {
  uid: "stu_uid_a",
  email: "a@alpha.edu",
  role: "student",
  instituteId: "INST_A",
  studentId: "STU_A",
  permissions: [],
  mustChangePassword: false,
};

const studentB: SessionUser = {
  uid: "stu_uid_b",
  email: "b@beta.edu",
  role: "student",
  instituteId: "INST_B",
  studentId: "STU_B",
  permissions: [],
  mustChangePassword: false,
};

const instAdmin: SessionUser = {
  uid: "admin_a",
  email: "admin@alpha.edu",
  role: "institute_admin",
  instituteId: "INST_A",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

describe("Student Portal — Ownership, Publication & Isolation", () => {
  beforeEach(() => {
    store.clear();
    getCol("institutes").set("INST_A", {
      id: "INST_A",
      name: "Alpha Institute",
      code: "INS-ALPH-0001",
      status: "active",
    });
    getCol("institutes").set("INST_B", {
      id: "INST_B",
      name: "Beta Institute",
      code: "INS-BETA-0002",
      status: "suspended",
    });
    getCol("students").set("STU_A", {
      id: "STU_A",
      studentCode: "STU-ALPH-01",
      instituteId: "INST_A",
      fullName: "Ananya",
      status: "active",
    });
    getCol("students").set("STU_B", {
      id: "STU_B",
      studentCode: "STU-BETA-01",
      instituteId: "INST_B",
      fullName: "Rohan",
      status: "active",
    });

    getCol("marksheets").set("ms_pub", {
      id: "ms_pub",
      instituteId: "INST_A",
      studentId: "STU_A",
      examTitle: "Mid-Term",
      published: true,
      createdAt: "2026-11-01",
    });
    getCol("marksheets").set("ms_draft", {
      id: "ms_draft",
      instituteId: "INST_A",
      studentId: "STU_A",
      examTitle: "Final Draft",
      published: false,
      createdAt: "2026-11-02",
    });
    getCol("marksheets").set("ms_other_stu", {
      id: "ms_other_stu",
      instituteId: "INST_A",
      studentId: "STU_OTHER",
      examTitle: "Mid-Term",
      published: true,
      createdAt: "2026-11-01",
    });

    getCol("communication_logs").set("MSG_1", {
      id: "MSG_1",
      instituteId: "INST_A",
      channel: "in_app",
      category: "general",
      message: "Welcome to Alpha",
      createdAt: "2026-11-26",
    });
  });

  it("returns only published marksheets belonging to the authenticated student", async () => {
    const res = await getStudentExamsAndResults(studentA);
    expect(res.publishedMarksheets).toHaveLength(1);
    expect(res.publishedMarksheets[0]?.id).toBe("ms_pub");
  });

  it("blocks student access when parent institute is suspended", async () => {
    await expect(getStudentPortalContext(studentB)).rejects.toMatchObject({
      status: 423,
      code: "INSTITUTE_SUSPENDED",
    });
  });

  it("rejects non-student roles from student portal services", async () => {
    await expect(getStudentPortalContext(instAdmin)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("persists notification read status in Firestore", async () => {
    const before = await getStudentNotifications(studentA);
    expect(before[0]?.read).toBe(false);

    await markStudentNotificationRead(studentA, "MSG_1");
    const after = await getStudentNotifications(studentA);
    expect(after[0]?.read).toBe(true);
    expect((await getStudentPortalContext(studentA)).unreadNotificationsCount).toBe(0);
  });
});
