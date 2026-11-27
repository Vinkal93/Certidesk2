import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({}),
}));

import {
  getBusinessReportData,
  getFinancialReportData,
  getReportCutoffIso,
  getSecurityReportData,
  getUsageReportData,
  runApprovedCustomReport,
  sanitizeCsvCell,
  saveReportSchedule,
} from "@/services/reports.service";
import { redactSensitiveMetadata } from "@/services/audit.service";
import type { SessionUser } from "@/types/auth";

const instituteAdminUser: SessionUser = {
  uid: "inst_admin_1",
  email: "admin@institute.edu",
  role: "institute_admin",
  instituteId: "INST_1",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

const studentUser: SessionUser = {
  uid: "student_1",
  email: "student@institute.edu",
  role: "student",
  instituteId: "INST_1",
  studentId: "STU_1",
  permissions: [],
  mustChangePassword: false,
};

describe("Enterprise Reporting & BI Center", () => {
  it("computes accurate date cutoffs for 7d, 30d, 90d, and all", () => {
    expect(getReportCutoffIso("all")).toBeNull();

    const now = Date.now();
    const d7 = Date.parse(getReportCutoffIso("7d") ?? "");
    const d30 = Date.parse(getReportCutoffIso("30d") ?? "");
    const d90 = Date.parse(getReportCutoffIso("90d") ?? "");

    expect(Number.isFinite(d7)).toBe(true);
    expect(Number.isFinite(d30)).toBe(true);
    expect(Number.isFinite(d90)).toBe(true);
    expect(d7).toBeGreaterThan(d30);
    expect(d30).toBeGreaterThan(d90);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(now - d7 - sevenDaysMs)).toBeLessThan(5000);
  });

  it("escapes CSV cells safely including quotes, commas, newlines, and nulls", () => {
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
    expect(sanitizeCsvCell("plain")).toBe('"plain"');
    expect(sanitizeCsvCell("hello, world")).toBe('"hello, world"');
    expect(sanitizeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(sanitizeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("enforces Super Admin-only authorization on all report & schedule endpoints", async () => {
    await expect(getBusinessReportData(instituteAdminUser, "30d")).rejects.toThrow(
      /Super Admin authorization required/i
    );
    await expect(getFinancialReportData(instituteAdminUser, "30d")).rejects.toThrow(
      /Super Admin authorization required/i
    );
    await expect(getUsageReportData(instituteAdminUser)).rejects.toThrow(
      /Super Admin authorization required/i
    );
    await expect(getSecurityReportData(studentUser, "30d")).rejects.toThrow(
      /Super Admin authorization required/i
    );
    await expect(
      runApprovedCustomReport(instituteAdminUser, {
        dataset: "institutes",
        range: "30d",
        limit: 10,
      })
    ).rejects.toThrow(/Super Admin authorization required/i);
    await expect(
      saveReportSchedule(instituteAdminUser, {
        name: "Weekly Revenue",
        category: "financial",
        cadence: "weekly",
        timezone: "Asia/Kolkata",
        recipients: ["ops@certidesk.in"],
        enabled: true,
      })
    ).rejects.toThrow(/Super Admin authorization required/i);
  });

  it("redacts sensitive fields from audit metadata before security report exports", () => {
    const redacted = redactSensitiveMetadata({
      action: "login_failed",
      password: "super-secret-password",
      sessionCookie: "cookie-abc-123",
      otpCode: "482910",
      token: "jwt-xyz",
      apiSecret: "sec_999",
      safeField: "ok",
    });

    expect(redacted.action).toBe("login_failed");
    expect(redacted.safeField).toBe("ok");
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.sessionCookie).toBe("[REDACTED]");
    expect(redacted.otpCode).toBe("[REDACTED]");
    expect(redacted.token).toBe("[REDACTED]");
    expect(redacted.apiSecret).toBe("[REDACTED]");
  });

  it("locks reportDefinitions, reportSchedules, and reportExports to server-only writes in firestore.rules", () => {
    const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf8");
    expect(rules).toContain("match /reportDefinitions/{defId}");
    expect(rules).toContain("match /reportSchedules/{schedId}");
    expect(rules).toContain("match /reportExports/{expId}");

    for (const col of ["reportDefinitions", "reportSchedules", "reportExports"]) {
      const idx = rules.indexOf(`match /${col}/`);
      const slice = rules.slice(idx, idx + 180);
      expect(slice).toContain("allow read: if isSuperAdmin();");
      expect(slice).toContain("allow write: if false;");
    }
  });
});
