export type ServiceHealthStatus =
  "healthy" | "degraded" | "unavailable" | "unknown" | "not_configured";

export type EmergencyServiceCategory =
  | "Authentication"
  | "Institute Management"
  | "Student Management"
  | "Admissions"
  | "Fee Management"
  | "Payments"
  | "Certificates"
  | "Certificate Verification"
  | "Examinations"
  | "Notifications"
  | "Reports"
  | "Public Website"
  | "External Integrations";

export interface ServiceRegistryDefinition {
  id: string;
  name: string;
  category: EmergencyServiceCategory;
  description: string;
  operations: string[];
  criticality: "tier_0" | "tier_1" | "tier_2";
}

/**
 * Real service registry grounded strictly in existing CertiDesk Pro modules.
 */
export const SERVICE_REGISTRY: ServiceRegistryDefinition[] = [
  {
    id: "authentication",
    name: "Authentication & Sessions",
    category: "Authentication",
    description: "Firebase Auth login, QR login, and HTTP-only session verification.",
    operations: ["login", "qr_login", "password_reset"],
    criticality: "tier_0",
  },
  {
    id: "institute_management",
    name: "Institute Workspaces",
    category: "Institute Management",
    description: "Institute portal settings, staff accounts, courses, and batches.",
    operations: ["create", "update", "delete", "read"],
    criticality: "tier_0",
  },
  {
    id: "student_management",
    name: "Student Records & Portal",
    category: "Student Management",
    description: "Student profiles, attendance registers, and student dashboard.",
    operations: ["create", "update", "delete", "read"],
    criticality: "tier_1",
  },
  {
    id: "admissions",
    name: "Admissions & Public Registration",
    category: "Admissions",
    description: "New institute self-registration and student admission workflows.",
    operations: ["register_institute", "admit_student"],
    criticality: "tier_1",
  },
  {
    id: "fee_management",
    name: "Fee & Accounting Ledgers",
    category: "Fee Management",
    description: "Fee structures, fee collection, receipts, refunds, and P&L ledgers.",
    operations: ["collect_fee", "refund_fee", "create_structure"],
    criticality: "tier_1",
  },
  {
    id: "payments_razorpay",
    name: "Razorpay Wallet & Checkout",
    category: "Payments",
    description: "Prepaid wallet recharge orders, signature verification, and webhooks.",
    operations: ["create_order", "verify_payment", "webhook"],
    criticality: "tier_0",
  },
  {
    id: "certificates",
    name: "Certificate & Marksheet Issuance",
    category: "Certificates",
    description:
      "Generating, issuing, and revoking official certificates and marksheets.",
    operations: ["issue", "revoke", "pdf_export"],
    criticality: "tier_1",
  },
  {
    id: "certificate_verification",
    name: "Public QR Verification",
    category: "Certificate Verification",
    description: "Public /verify/[verificationId] credential authenticity checks.",
    operations: ["verify"],
    criticality: "tier_0",
  },
  {
    id: "online_exams",
    name: "Online Examinations & Question Bank",
    category: "Examinations",
    description: "Exam scheduling, student attempts, and automated grading.",
    operations: ["create_exam", "attempt_exam", "grade"],
    criticality: "tier_1",
  },
  {
    id: "notifications",
    name: "Communication & Announcements",
    category: "Notifications",
    description: "Institute notices, student alerts, and Super Admin announcements.",
    operations: ["send", "broadcast"],
    criticality: "tier_2",
  },
  {
    id: "reports_analytics",
    name: "Reports & Analytics",
    category: "Reports",
    description: "Institutional analytics, CSV/PDF exports, and custom report builder.",
    operations: ["view", "export"],
    criticality: "tier_2",
  },
  {
    id: "public_website",
    name: "Public Marketing & Download Center",
    category: "Public Website",
    description: "Public landing pages, SEO pages, and PWA distribution center.",
    operations: ["browse"],
    criticality: "tier_2",
  },
];

export type MaintenanceType =
  "full_platform" | "selected_service" | "selected_institute" | "scheduled" | "emergency";

export type MaintenanceScope = "platform" | "services" | "institutes";
export type MaintenanceStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface MaintenanceEventRecord {
  id: string;
  name: string;
  description: string;
  type: MaintenanceType;
  scope: MaintenanceScope;
  affectedServices: string[];
  affectedInstituteIds: string[];
  status: MaintenanceStatus;
  startAt: string;
  expectedEndAt: string;
  actualEndAt?: string;
  publicMessage: string;
  internalNotes?: string;
  notifyInstitutes: boolean;
  createdByUid: string;
  updatedByUid: string;
  createdAt: string;
  updatedAt: string;
}

export type LockdownType =
  "global" | "institute" | "authentication" | "api_write" | "admin_actions";

export type LockdownStatus = "active" | "released";

export interface PlatformLockdownRecord {
  id: string;
  type: LockdownType;
  scope: "platform" | "institute";
  instituteId?: string;
  instituteName?: string;
  instituteCode?: string;
  restrictedServices: string[];
  status: LockdownStatus;
  reason: string;
  exemptSuperAdminUids: string[];
  activatedAt: string;
  releasedAt?: string;
  releasedByUid?: string;
  releaseReason?: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export type RestrictionType =
  | "global_disable"
  | "institute_disable"
  | "read_only"
  | "operation_disable"
  | "temporary"
  | "scheduled";

export type RestrictionStatus = "active" | "scheduled" | "expired" | "restored";

export interface ServiceRestrictionRecord {
  id: string;
  serviceId: string;
  restrictionType: RestrictionType;
  scope: "global" | "institute";
  instituteIds: string[];
  disabledOperations: string[];
  status: RestrictionStatus;
  reason: string;
  userMessage: string;
  internalNotes?: string;
  startAt: string;
  expiresAt?: string;
  restoredAt?: string;
  restoredByUid?: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export type EnterpriseIncidentSeverity = "critical" | "high" | "medium" | "low" | "info";

export type EnterpriseIncidentStatus =
  | "detected"
  | "acknowledged"
  | "investigating"
  | "mitigating"
  | "monitoring"
  | "resolved"
  | "closed";

export type IncidentCategory =
  | "availability"
  | "security"
  | "payments"
  | "authentication"
  | "data_integrity"
  | "performance"
  | "integration";

export interface IncidentRecord {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: EnterpriseIncidentSeverity;
  status: EnterpriseIncidentStatus;
  affectedServices: string[];
  affectedInstituteIds: string[];
  detectionSource: string;
  reportedByUid: string;
  assignedToUid?: string;
  impactDescription?: string;
  internalNotes?: string;
  resolutionSummary?: string;
  relatedIncidentIds: string[];
  acknowledgedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentCommentRecord {
  id: string;
  incidentId: string;
  type: "comment" | "status_change" | "assignment" | "severity_change" | "evidence";
  body: string;
  actorUid: string;
  actorEmail?: string | null;
  metadata?: Record<string, string | null>;
  createdAt: string;
}

export const INCIDENT_TRANSITIONS: Record<
  EnterpriseIncidentStatus,
  EnterpriseIncidentStatus[]
> = {
  detected: ["acknowledged", "investigating", "resolved"],
  acknowledged: ["investigating", "mitigating", "resolved"],
  investigating: ["mitigating", "monitoring", "resolved"],
  mitigating: ["monitoring", "resolved", "investigating"],
  monitoring: ["resolved", "mitigating"],
  resolved: ["closed", "investigating"],
  closed: ["investigating"],
};

export type RecoveryType =
  | "restore_service"
  | "end_maintenance"
  | "release_lockdown"
  | "verify_auth"
  | "verify_firestore"
  | "verify_app_health"
  | "verify_razorpay";

export type RecoveryStatus =
  "assessed" | "approved" | "executing" | "completed" | "failed";

export interface RecoveryOperationRecord {
  id: string;
  relatedIncidentId?: string;
  recoveryType: RecoveryType;
  targetServiceId?: string;
  targetInstituteId?: string;
  targetResourceId?: string;
  objective: string;
  impactAssessment: string;
  priority: "p1" | "p2" | "p3";
  requiresApproval: boolean;
  approvedByUid?: string;
  approvedAt?: string;
  assignedToUid?: string;
  status: RecoveryStatus;
  verificationResult?: string;
  internalNotes?: string;
  createdByUid: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryStepRecord {
  id: string;
  recoveryId: string;
  stepOrder: number;
  label: string;
  status: "pending" | "completed" | "failed";
  detail: string;
  executedAt: string;
}

export interface HealthCheckSample {
  id: string;
  checkedAt: string;
  overallStatus: ServiceHealthStatus;
  services: {
    application: { status: ServiceHealthStatus; latencyMs: number };
    authentication: { status: ServiceHealthStatus; latencyMs: number };
    firestore: { status: ServiceHealthStatus; latencyMs: number };
    razorpay: { status: ServiceHealthStatus; detail: string };
    notifications: { status: ServiceHealthStatus; detail: string };
    backups: { status: ServiceHealthStatus; detail: string };
  };
}

export interface EmergencyAuditRecord {
  id: string;
  actorUid: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  previousState?: string;
  newState?: string;
  reason: string;
  correlationId: string;
  result: "success" | "failure";
  createdAt: string;
}

export interface PolicyEvaluationResult {
  blocked: boolean;
  code:
    | "MAINTENANCE_ACTIVE"
    | "LOCKDOWN_ACTIVE"
    | "SERVICE_RESTRICTED"
    | "READ_ONLY_MODE"
    | null;
  httpStatus: 200 | 423 | 503;
  message: string;
  expectedEndAt?: string;
  maintenanceEventId?: string;
  lockdownId?: string;
  restrictionId?: string;
}
