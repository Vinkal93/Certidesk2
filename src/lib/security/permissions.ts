import type { PortalType, SessionUser, StaffPermission, UserRole } from "@/types/auth";

export const PORTAL_ALLOWED_ROLES: Record<PortalType, readonly UserRole[]> = {
  super_admin: ["super_admin"],
  institute: ["institute_admin", "staff"],
  student: ["student"],
};

export const PORTAL_HOME_ROUTES: Record<PortalType, string> = {
  super_admin: "/su/dashboard",
  institute: "/institute/dashboard",
  student: "/student/dashboard",
};

export const PORTAL_LOGIN_ROUTES: Record<PortalType, string> = {
  super_admin: "/su",
  institute: "/institute/login",
  student: "/student/login",
};

const VALID_ROLES: readonly UserRole[] = [
  "super_admin",
  "institute_admin",
  "staff",
  "student",
];

const VALID_STAFF_PERMISSIONS: readonly StaffPermission[] = [
  "students:read",
  "students:write",
  "courses:read",
  "courses:write",
  "batches:read",
  "batches:write",
  "staff:read",
  "staff:write",
  "attendance:read",
  "attendance:write",
  "fees:read",
  "fees:write",
  "exams:read",
  "exams:write",
  "certificates:read",
  "certificates:issue",
  "wallet:read",
  "reports:read",
  "communication:send",
  "settings:write",
];

export function isValidUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.includes(value as UserRole);
}

export function isRoleAllowedInPortal(role: UserRole, portal: PortalType): boolean {
  return PORTAL_ALLOWED_ROLES[portal].includes(role);
}

export function hasStaffPermission(
  user: Pick<SessionUser, "role" | "permissions">,
  required: StaffPermission
): boolean {
  if (user.role === "super_admin" || user.role === "institute_admin") {
    return true;
  }
  if (user.role === "staff") {
    return user.permissions.includes(required);
  }
  return false;
}

export function extractSessionUserFromClaims(claims: {
  uid: string;
  email?: string | undefined;
  role?: unknown;
  instituteId?: unknown;
  studentId?: unknown;
  permissions?: unknown;
  mustChangePassword?: unknown;
}): SessionUser | null {
  if (!isValidUserRole(claims.role)) {
    return null;
  }

  const permissions = Array.isArray(claims.permissions)
    ? claims.permissions.filter(
        (p): p is StaffPermission =>
          typeof p === "string" && VALID_STAFF_PERMISSIONS.includes(p as StaffPermission)
      )
    : [];

  return {
    uid: claims.uid,
    email: claims.email ?? null,
    role: claims.role,
    instituteId: typeof claims.instituteId === "string" ? claims.instituteId : null,
    studentId: typeof claims.studentId === "string" ? claims.studentId : null,
    permissions,
    mustChangePassword: claims.mustChangePassword === true,
  };
}
