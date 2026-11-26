export type UserRole = "super_admin" | "institute_admin" | "staff" | "student";

export type PortalType = "super_admin" | "institute" | "student";

export type StaffPermission =
  | "students:read"
  | "students:write"
  | "courses:read"
  | "courses:write"
  | "batches:read"
  | "batches:write"
  | "staff:read"
  | "staff:write"
  | "attendance:read"
  | "attendance:write"
  | "fees:read"
  | "fees:write"
  | "exams:read"
  | "exams:write"
  | "certificates:read"
  | "certificates:issue"
  | "wallet:read"
  | "reports:read"
  | "communication:send"
  | "settings:write";

export interface CustomUserClaims {
  role: UserRole;
  instituteId?: string | null;
  studentId?: string | null;
  permissions?: StaffPermission[];
  mustChangePassword?: boolean;
}

export interface SessionUser {
  uid: string;
  email: string | null;
  role: UserRole;
  instituteId: string | null;
  studentId: string | null;
  permissions: StaffPermission[];
  mustChangePassword: boolean;
}
