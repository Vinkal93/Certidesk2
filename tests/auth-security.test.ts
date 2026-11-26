import { describe, expect, it } from "vitest";
import {
  extractSessionUserFromClaims,
  hasStaffPermission,
  isRoleAllowedInPortal,
} from "@/lib/security/permissions";
import {
  createSessionSchema,
  instituteLoginSchema,
  studentLoginSchema,
  superAdminLoginSchema,
} from "@/lib/validation/auth";

describe("Phase 0 & 1 Security — Portal Role Enforcement", () => {
  it("allows super_admin only in super_admin portal", () => {
    expect(isRoleAllowedInPortal("super_admin", "super_admin")).toBe(true);
    expect(isRoleAllowedInPortal("super_admin", "institute")).toBe(false);
    expect(isRoleAllowedInPortal("super_admin", "student")).toBe(false);
  });

  it("allows institute_admin and staff only in institute portal", () => {
    expect(isRoleAllowedInPortal("institute_admin", "institute")).toBe(true);
    expect(isRoleAllowedInPortal("staff", "institute")).toBe(true);
    expect(isRoleAllowedInPortal("institute_admin", "super_admin")).toBe(false);
    expect(isRoleAllowedInPortal("institute_admin", "student")).toBe(false);
    expect(isRoleAllowedInPortal("staff", "student")).toBe(false);
  });

  it("allows student only in student portal", () => {
    expect(isRoleAllowedInPortal("student", "student")).toBe(true);
    expect(isRoleAllowedInPortal("student", "institute")).toBe(false);
    expect(isRoleAllowedInPortal("student", "super_admin")).toBe(false);
  });

  it("rejects claims without a valid role", () => {
    expect(
      extractSessionUserFromClaims({
        uid: "u1",
        email: "x@example.com",
        role: "unknown_role",
      })
    ).toBeNull();
    expect(
      extractSessionUserFromClaims({
        uid: "u1",
        email: "x@example.com",
      })
    ).toBeNull();
  });

  it("enforces staff permissions strictly", () => {
    const staffUser = {
      role: "staff" as const,
      permissions: ["students:read" as const],
    };
    expect(hasStaffPermission(staffUser, "students:read")).toBe(true);
    expect(hasStaffPermission(staffUser, "students:write")).toBe(false);
    expect(hasStaffPermission(staffUser, "wallet:read")).toBe(false);

    const adminUser = {
      role: "institute_admin" as const,
      permissions: [],
    };
    expect(hasStaffPermission(adminUser, "wallet:read")).toBe(true);
  });
});

describe("Phase 1 Validation — Auth Schemas", () => {
  it("normalizes instituteId and studentId to uppercase", () => {
    const inst = instituteLoginSchema.parse({
      instituteId: "ins-apex-1a2b",
      password: "Password123",
    });
    expect(inst.instituteId).toBe("INS-APEX-1A2B");

    const stu = studentLoginSchema.parse({
      studentId: "stu-1a2b26-3c4d",
      password: "Password123",
    });
    expect(stu.studentId).toBe("STU-1A2B26-3C4D");
  });

  it("rejects invalid super admin email or short password", () => {
    expect(
      superAdminLoginSchema.safeParse({ email: "not-an-email", password: "123" }).success
    ).toBe(false);
  });

  it("validates session creation payload", () => {
    expect(
      createSessionSchema.safeParse({
        idToken: "x".repeat(30),
        portal: "institute",
      }).success
    ).toBe(true);
    expect(
      createSessionSchema.safeParse({
        idToken: "short",
        portal: "invalid",
      }).success
    ).toBe(false);
  });
});
