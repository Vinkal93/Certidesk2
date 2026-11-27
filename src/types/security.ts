import type { UserRole } from "./auth";

export type LoginEventResult = "success" | "failed" | "blocked";
export type SecurityAlertSeverity = "critical" | "high" | "medium" | "low";
export type SecurityAlertStatus =
  "new" | "acknowledged" | "investigating" | "resolved" | "false_positive";

export type SecuritySessionStatus = "active" | "expired" | "revoked";

export interface SecurityLoginEventRecord {
  id: string;
  userId: string | null;
  identifier: string;
  role: UserRole | "unknown";
  instituteId: string | null;
  timestamp: string;
  authMethod: "password" | "id_token" | "session_cookie";
  result: LoginEventResult;
  failureCategory: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string;
  sessionId: string | null;
  notes: Array<{ authorUid: string; note: string; createdAt: string }>;
}

export interface SecuritySessionRecord {
  id: string;
  userId: string;
  email: string | null;
  role: UserRole;
  instituteId: string | null;
  createdAt: string;
  lastVerifiedAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: SecuritySessionStatus;
  revokedAt: string | null;
  revokedByUid: string | null;
  revokeReason: string | null;
}

export interface SecurityAlertRecord {
  id: string;
  ruleId: string;
  dedupKey: string;
  severity: SecurityAlertSeverity;
  category: string;
  title: string;
  summary: string;
  status: SecurityAlertStatus;
  relatedUid: string | null;
  relatedEmail: string | null;
  relatedInstituteId: string | null;
  relatedEvents: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  eventCount: number;
  assignedToUid: string | null;
  notes: Array<{ authorUid: string; note: string; createdAt: string }>;
  resolutionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityAlertRuleRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  threshold: number;
  windowMinutes: number;
  cooldownMinutes: number;
  severity: SecurityAlertSeverity;
  updatedAt: string;
  updatedByUid: string;
}

export interface SecurityPolicyConfig {
  id: "policy";
  sessionLifetimeDays: number;
  idleTimeoutMinutes: number;
  requireSuperAdminMfa: boolean;
  maxFailedLoginThreshold: number;
  failedLoginWindowMinutes: number;
  auditRetentionDays: number;
  loginEventRetentionDays: number;
  updatedAt: string;
  updatedByUid: string;
}

export interface UserPermissionOverrideRecord {
  uid: string;
  email: string;
  role: UserRole;
  instituteId: string | null;
  grantedPermissions: string[];
  revokedPermissions: string[];
  reason: string;
  updatedAt: string;
  updatedByUid: string;
}
