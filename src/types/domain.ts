import type { StaffPermission, UserRole } from "./auth";

export type InstituteStatus = "active" | "suspended";
export type StudentStatus = "active" | "disabled" | "deleted";
export type OnboardingStatus = "registered" | "verified" | "wallet_skipped" | "completed";
export type SpendOrderPolicy = "bonus_first" | "paid_first";

export interface InstitutePricingConfig {
  admissionFeePaise: number;
  profileUpdateFeePaise: number;
  certificateFeePaise: number;
}

export interface InstituteWalletSummary {
  paidBalancePaise: number;
  bonusBalancePaise: number;
  totalSpendableBalancePaise: number;
  currency: "INR";
  version: number;
  updatedAt: string;
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
  onboardingStatus?: OnboardingStatus;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  walletBalancePaise: number;
  paidBalancePaise?: number;
  bonusBalancePaise?: number;
  walletVersion?: number;
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
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WalletTransactionType = "credit" | "debit";
export type WalletLedgerBucket = "paid" | "bonus";
export type WalletLedgerType =
  | "recharge_credit"
  | "promotional_bonus"
  | "admission_debit"
  | "profile_edit_debit"
  | "administrative_credit"
  | "administrative_debit"
  | "refund_credit"
  | "promotional_expiry";

export type WalletTransactionReason =
  | "initial_balance"
  | "razorpay_recharge"
  | "promotional_bonus"
  | "student_admission"
  | "student_profile_update"
  | "manual_adjustment"
  | "payment_refund"
  | "promotional_expiry";

export interface WalletTransactionRecord {
  id: string;
  instituteId: string;
  type: WalletTransactionType;
  ledgerType?: WalletLedgerType;
  bucket?: WalletLedgerBucket;
  direction?: WalletTransactionType;
  amountPaise: number;
  balanceBeforePaise?: number;
  balanceAfterPaise: number;
  paidBalanceAfterPaise?: number;
  bonusBalanceAfterPaise?: number;
  currency?: "INR";
  reason: WalletTransactionReason;
  source?: string;
  referenceId: string;
  reference?: string | null;
  idempotencyKey?: string;
  status?: "completed" | "reversed";
  actorUid: string;
  note: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface RechargePlanRecord {
  id: string;
  title: string;
  description: string;
  amountPaise: number;
  bonusPaise: number;
  currency: "INR";
  enabled: boolean;
  displayOrder: number;
  promoEligible: boolean;
  promoLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  bonusExpiryDays: number | null;
  maxUsesPerInstitute: number | null;
  createdAt: string;
  updatedAt: string;
  updatedByUid: string;
}

export interface WalletBonusGrantRecord {
  id: string;
  instituteId: string;
  paymentId: string;
  orderId: string;
  planId: string;
  grantedPaise: number;
  remainingPaise: number;
  expiresAt: string | null;
  expired: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdmissionOperationStatus =
  "pending" | "auth_created" | "completed" | "failed" | "reconciled";

export interface AdmissionOperationRecord {
  id: string;
  idempotencyKey: string;
  instituteId: string;
  actorUid: string;
  studentId: string | null;
  studentCode: string | null;
  authUid: string | null;
  email: string;
  admissionFeePaise: number;
  status: AdmissionOperationStatus;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_REJECTED"
  | "AUTH_LOGOUT"
  | "PASSWORD_CHANGED"
  | "INSTITUTE_CREATED"
  | "INSTITUTE_SELF_REGISTERED"
  | "INSTITUTE_ONBOARDING_UPDATED"
  | "INSTITUTE_UPDATED"
  | "INSTITUTE_SUSPENDED"
  | "INSTITUTE_ACTIVATED"
  | "INSTITUTE_ACCESS_RESET"
  | "RECHARGE_PLAN_UPDATED"
  | "PRICING_UPDATED"
  | "STUDENT_ADMITTED"
  | "STUDENT_ADMISSION_FAILED"
  | "STUDENT_UPDATED"
  | "STUDENT_DELETED"
  | "STUDENT_RESTORED"
  | "STUDENT_STATUS_CHANGED"
  | "STUDENT_ACCESS_RESET"
  | "COURSE_CREATED"
  | "COURSE_UPDATED"
  | "COURSE_DELETED"
  | "COURSE_RESTORED"
  | "FEE_RECEIPT_REVERSED"
  | "QUESTION_DELETED"
  | "QUESTION_IMPORTED"
  | "WALLET_CREDITED"
  | "WALLET_BONUS_CREDITED"
  | "WALLET_DEBITED"
  | "WALLET_RECONCILED"
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
  | "SECURITY_SESSIONS_REVOKED"
  | "FEE_STRUCTURE_CREATED"
  | "FEE_PAYMENT_COLLECTED"
  | "FEE_REFUND_PROCESSED"
  | "LEDGER_ENTRY_POSTED"
  | "ONLINE_EXAM_CREATED"
  | "ONLINE_EXAM_RESULTS_DECLARED"
  | "TEMPLATE_PUBLISHED"
  | "USER_BLOCKED"
  | "USER_UNBLOCKED"
  | "USER_FORCE_LOGOUT"
  | "USER_DELETED"
  | "SUBSCRIPTION_FEE_CONFIGURED";

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
