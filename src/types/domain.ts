import type { StaffPermission, UserRole } from "./auth";

export type InstituteStatus = "active" | "suspended";
export type StudentStatus = "active" | "disabled";

export interface InstitutePricingConfig {
  admissionFeePaise: number;
  profileUpdateFeePaise: number;
  certificateFeePaise: number;
}

export interface InstituteRecord {
  id: string;
  code: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  adminUid: string;
  status: InstituteStatus;
  walletBalancePaise: number;
  pricing: InstitutePricingConfig;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  instituteId: string | null;
  studentId: string | null;
  permissions: StaffPermission[];
  disabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginIdentifierMapping {
  identifier: string;
  portal: "institute" | "student";
  uid: string;
  authEmail: string;
  instituteId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentRecord {
  id: string;
  studentCode: string;
  instituteId: string;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  admissionDate?: string;
  courseId?: string | null;
  batchId?: string | null;
  photoUrl?: string | null;
  courseName: string;
  batchName: string;
  status: StudentStatus;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WalletTransactionType = "credit" | "debit";
export type WalletTransactionReason =
  | "initial_balance"
  | "razorpay_recharge"
  | "student_admission"
  | "student_profile_update"
  | "manual_adjustment";

export interface WalletTransactionRecord {
  id: string;
  instituteId: string;
  type: WalletTransactionType;
  amountPaise: number;
  balanceAfterPaise: number;
  reason: WalletTransactionReason;
  referenceId: string;
  actorUid: string;
  note: string;
  createdAt: string;
}

export type AuditAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_REJECTED"
  | "AUTH_LOGOUT"
  | "PASSWORD_CHANGED"
  | "INSTITUTE_CREATED"
  | "INSTITUTE_UPDATED"
  | "INSTITUTE_SUSPENDED"
  | "INSTITUTE_ACTIVATED"
  | "INSTITUTE_ACCESS_RESET"
  | "STUDENT_ADMITTED"
  | "STUDENT_UPDATED"
  | "STUDENT_STATUS_CHANGED"
  | "STUDENT_ACCESS_RESET"
  | "WALLET_CREDITED"
  | "WALLET_DEBITED"
  | "GATEWAY_CONFIGURED"
  | "GATEWAY_CONNECTION_TESTED"
  | "GATEWAY_WEBHOOK_SECRET_SAVED"
  | "GATEWAY_WEBHOOK_VERIFIED"
  | "GATEWAY_ACTIVATED"
  | "GATEWAY_DISABLED"
  | "PAYMENT_REFUNDED"
  | "SUBSCRIPTION_ASSIGNED"
  | "ENTITLEMENT_OVERRIDE_SET"
  | "FEATURE_FLAG_UPDATED"
  | "FEATURE_FLAG_KILL_SWITCH_ENABLED"
  | "FEATURE_FLAG_ROLLED_BACK"
  | "EMERGENCY_ACTION_APPLIED"
  | "EMERGENCY_ACTION_ROLLED_BACK"
  | "INCIDENT_CREATED"
  | "INCIDENT_UPDATED"
  | "SECURITY_SESSIONS_REVOKED";

export interface AuditLogRecord {
  id: string;
  action: AuditAction;
  actorUid: string;
  actorRole: UserRole | "system";
  instituteId: string | null;
  targetId: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}
