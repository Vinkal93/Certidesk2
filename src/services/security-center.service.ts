import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
  auditLogsCollection,
  securityAlertRulesCollection,
  securityAlertsCollection,
  securityLoginEventsCollection,
  securityPoliciesCollection,
  securitySessionsCollection,
  userPermissionOverridesCollection,
  usersCollection,
  webhookEventsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import { getSecurityPolicy, listAlertRules } from "./security-events.service";
import type { SessionUser, UserRole } from "@/types/auth";
import type {
  SecurityAlertRecord,
  SecurityAlertRuleRecord,
  SecurityAlertSeverity,
  SecurityAlertStatus,
  SecurityLoginEventRecord,
  SecurityPolicyConfig,
  SecuritySessionRecord,
  UserPermissionOverrideRecord,
} from "@/types/security";

export interface SecurityEventRecord {
  id: string;
  type:
    | "session_revoked"
    | "failed_login"
    | "webhook_rejected"
    | "role_mismatch"
    | "emergency_lockdown";
  severity: "low" | "medium" | "high" | "critical";
  actorUid?: string;
  targetUid?: string;
  instituteId?: string;
  summary: string;
  createdAt: string;
  resolved: boolean;
}

function securityEventsCol() {
  return getAdminFirestore().collection(
    "securityEvents"
  ) as CollectionReference<SecurityEventRecord>;
}

function assertSuperAdmin(actor: SessionUser) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
}

export const PERMISSION_CATALOG = [
  {
    group: "Platform & Security",
    key: "security.dashboard.read",
    label: "View Security Dashboard",
  },
  {
    group: "Platform & Security",
    key: "security.sessions.revoke",
    label: "Revoke User/Institute Sessions",
  },
  {
    group: "Platform & Security",
    key: "security.audit.read",
    label: "Inspect Immutable Audit Logs",
  },
  {
    group: "Platform & Security",
    key: "security.permissions.manage",
    label: "Manage Access Control & Overrides",
  },
  {
    group: "Platform & Security",
    key: "platform.settings.write",
    label: "Modify Global Platform Settings",
  },
  {
    group: "Platform & Security",
    key: "emergency.operations.execute",
    label: "Execute Emergency Lockdown/Maintenance",
  },
  { group: "Students & Academics", key: "students:read", label: "View Students" },
  {
    group: "Students & Academics",
    key: "students:write",
    label: "Admit & Edit Students",
  },
  { group: "Students & Academics", key: "courses:read", label: "View Courses" },
  { group: "Students & Academics", key: "courses:write", label: "Manage Courses" },
  { group: "Students & Academics", key: "batches:read", label: "View Batches" },
  { group: "Students & Academics", key: "batches:write", label: "Manage Batches" },
  { group: "Students & Academics", key: "staff:read", label: "View Staff" },
  { group: "Students & Academics", key: "staff:write", label: "Manage Staff" },
  { group: "Students & Academics", key: "attendance:read", label: "View Attendance" },
  { group: "Students & Academics", key: "attendance:write", label: "Record Attendance" },
  {
    group: "Exams & Certificates",
    key: "exams:read",
    label: "View Examinations & Results",
  },
  {
    group: "Exams & Certificates",
    key: "exams:write",
    label: "Publish Examinations & Marks",
  },
  { group: "Exams & Certificates", key: "certificates:read", label: "View Certificates" },
  {
    group: "Exams & Certificates",
    key: "certificates:issue",
    label: "Issue & Revoke Certificates",
  },
  { group: "Finance & Wallet", key: "fees:read", label: "View Student Fees" },
  { group: "Finance & Wallet", key: "fees:write", label: "Collect & Manage Fees" },
  {
    group: "Finance & Wallet",
    key: "wallet:read",
    label: "View Institute Wallet & Ledger",
  },
  { group: "Finance & Wallet", key: "reports:read", label: "View Reports & Analytics" },
] as const;

export const SYSTEM_ROLE_DEFINITIONS: Array<{
  role: UserRole | "public";
  label: string;
  scope: string;
  description: string;
  defaultPermissions: string[];
}> = [
  {
    role: "super_admin",
    label: "Super Admin",
    scope: "Platform-wide",
    description:
      "Platform owner with full control over institutes, pricing, security, and emergency ops.",
    defaultPermissions: ["*"],
  },
  {
    role: "institute_admin",
    label: "Institute Admin",
    scope: "Single Institute",
    description:
      "Institute owner with full tenant access to students, staff, wallet, exams, and certificates.",
    defaultPermissions: PERMISSION_CATALOG.filter(
      (p) => !p.group.startsWith("Platform")
    ).map((p) => p.key),
  },
  {
    role: "staff",
    label: "Institute Staff",
    scope: "Single Institute (Explicit Permissions)",
    description:
      "Least-privilege tenant operator granted explicit module permissions by Institute Admin.",
    defaultPermissions: ["students:read", "attendance:read"],
  },
  {
    role: "student",
    label: "Student",
    scope: "Self-Only",
    description:
      "Read-only access to own profile, attendance, exams, marksheets, certificates, and fee receipts.",
    defaultPermissions: ["self:profile:read", "self:academics:read"],
  },
  {
    role: "public",
    label: "Public Visitor",
    scope: "Unauthenticated",
    description:
      "Landing pages, public institute registration, and public certificate verification.",
    defaultPermissions: ["public:register", "public:verify_certificate"],
  },
];

function getCutoffIso(window: string): string | null {
  const now = Date.now();
  switch (window) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "90d":
      return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

export async function getSecurityCenterOverview(
  actor: SessionUser,
  filters: {
    window?: string | undefined;
    role?: string | undefined;
    instituteId?: string | undefined;
  } = {}
) {
  assertSuperAdmin(actor);

  const cutoff = getCutoffIso(filters.window ?? "30d");

  const [
    loginSnap,
    sessionsSnap,
    alertsSnap,
    auditSnap,
    webhooksSnap,
    usersSnap,
    eventsSnap,
    policy,
  ] = await Promise.all([
    securityLoginEventsCollection().get(),
    securitySessionsCollection().get(),
    securityAlertsCollection().get(),
    auditLogsCollection().orderBy("createdAt", "desc").limit(150).get(),
    webhookEventsCollection().orderBy("receivedAt", "desc").limit(50).get(),
    usersCollection().limit(250).get(),
    securityEventsCol().orderBy("createdAt", "desc").limit(50).get(),
    getSecurityPolicy(),
  ]);

  let loginEvents = loginSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  if (cutoff) loginEvents = loginEvents.filter((e) => e.timestamp >= cutoff);
  if (filters.role && filters.role !== "all") {
    loginEvents = loginEvents.filter((e) => e.role === filters.role);
  }
  if (filters.instituteId) {
    loginEvents = loginEvents.filter((e) => e.instituteId === filters.instituteId);
  }

  const nowMs = Date.now();
  const sessions = sessionsSnap.docs.map((d) => {
    const s = d.data();
    const effectiveStatus =
      s.status === "active" && Date.parse(s.expiresAt) <= nowMs ? "expired" : s.status;
    return { ...s, status: effectiveStatus };
  });

  const alerts = alertsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  const openAlerts = alerts.filter(
    (a) => a.status !== "resolved" && a.status !== "false_positive"
  );
  const criticalAlerts = openAlerts.filter((a) => a.severity === "critical");

  const audits = auditSnap.docs.map((d) => d.data());
  const loginAudits = audits.filter(
    (a) =>
      a.action.startsWith("AUTH_") ||
      a.action === "SECURITY_SESSIONS_REVOKED" ||
      a.action === "PASSWORD_CHANGED"
  );

  const webhooks = webhooksSnap.docs.map((d) => d.data());
  const rejectedWebhooks = webhooks.filter(
    (w) => w.status === "rejected" || w.status === "failed"
  );

  const users = usersSnap.docs.map((d) => d.data());
  const superAdmins = users.filter((u) => u.role === "super_admin");

  let mfaEnrolledSuperAdmins: number | null = null;
  let mfaMissingSuperAdmins: string[] = [];
  try {
    const listRes = await getAdminAuth().listUsers(100);
    const authMap = new Map(listRes.users.map((u) => [u.uid, u]));
    let enrolled = 0;
    const missing: string[] = [];
    for (const sa of superAdmins) {
      const authRec = authMap.get(sa.uid);
      const factors = authRec?.multiFactor?.enrolledFactors?.length ?? 0;
      if (factors > 0) {
        enrolled += 1;
      } else {
        missing.push(sa.email || sa.uid);
      }
    }
    mfaEnrolledSuperAdmins = enrolled;
    mfaMissingSuperAdmins = missing;
  } catch {
    mfaEnrolledSuperAdmins = null;
  }

  // Daily trend aggregation from real loginEvents
  const trendMap = new Map<string, { date: string; success: number; failed: number }>();
  for (const ev of loginEvents) {
    const day = ev.timestamp.slice(0, 10);
    const row = trendMap.get(day) ?? { date: day, success: 0, failed: 0 };
    if (ev.result === "success") row.success += 1;
    else row.failed += 1;
    trendMap.set(day, row);
  }
  const loginTrend = Array.from(trendMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const alertSeverityCounts: Record<SecurityAlertSeverity, number> = {
    critical: openAlerts.filter((a) => a.severity === "critical").length,
    high: openAlerts.filter((a) => a.severity === "high").length,
    medium: openAlerts.filter((a) => a.severity === "medium").length,
    low: openAlerts.filter((a) => a.severity === "low").length,
  };

  return {
    dataFreshnessAt: new Date().toISOString(),
    metrics: {
      successfulLogins: loginEvents.filter((e) => e.result === "success").length,
      failedLogins: loginEvents.filter((e) => e.result === "failed").length,
      blockedLogins: loginEvents.filter((e) => e.result === "blocked").length,
      activeSessions: sessions.filter((s) => s.status === "active").length,
      revokedSessions: sessions.filter((s) => s.status === "revoked").length,
      expiredSessions: sessions.filter((s) => s.status === "expired").length,
      openAlerts: openAlerts.length,
      criticalAlerts: criticalAlerts.length,
      openSecurityEvents:
        openAlerts.length + eventsSnap.docs.filter((d) => !d.data().resolved).length,
      rejectedWebhooks: rejectedWebhooks.length,
      trackedAuthEvents: loginAudits.length,
      failedLoginEvents: loginEvents.filter((e) => e.result !== "success").length,
      activeUsersTracked: users.filter((u) => !u.disabled).length,
      superAdminCount: superAdmins.length,
      mfaEnrolledSuperAdmins,
      mfaMissingSuperAdmins,
      latestEventAt: loginEvents[0]?.timestamp ?? audits[0]?.createdAt ?? null,
    },
    loginTrend,
    alertSeverityCounts,
    policy,
    loginEvents: loginEvents.slice(0, 50),
    loginAudits: loginAudits.slice(0, 40),
    rejectedWebhooks: rejectedWebhooks.slice(0, 20),
    securityEvents: eventsSnap.docs.map((d) => d.data()),
    alerts: alerts.slice(0, 50),
    manageableUsers: users
      .map((u) => ({
        uid: u.uid,
        name: u.displayName,
        email: u.email,
        role: u.role,
        status: u.disabled ? "disabled" : "active",
        instituteId: u.instituteId ?? "",
        updatedAt: u.updatedAt,
      }))
      .slice(0, 100),
  };
}

export async function listLoginActivity(
  actor: SessionUser,
  filters: {
    result?: string | undefined;
    role?: string | undefined;
    instituteId?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
  } = {}
): Promise<SecurityLoginEventRecord[]> {
  assertSuperAdmin(actor);
  const snap = await securityLoginEventsCollection().get();
  let items = snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (filters.result && filters.result !== "all") {
    items = items.filter((i) => i.result === filters.result);
  }
  if (filters.role && filters.role !== "all") {
    items = items.filter((i) => i.role === filters.role);
  }
  if (filters.instituteId) {
    items = items.filter((i) => i.instituteId === filters.instituteId);
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.identifier.toLowerCase().includes(q) ||
        (i.ipAddress ?? "").toLowerCase().includes(q) ||
        (i.userId ?? "").toLowerCase().includes(q) ||
        (i.failureCategory ?? "").toLowerCase().includes(q)
    );
  }
  return items.slice(0, Math.min(filters.limit ?? 100, 200));
}

export async function addLoginEventInvestigationNote(
  actor: SessionUser,
  eventId: string,
  note: string
): Promise<SecurityLoginEventRecord> {
  assertSuperAdmin(actor);
  if (!note.trim()) {
    throw new AuthError(400, "NOTE_REQUIRED", "Investigation note is required.");
  }
  const ref = securityLoginEventsCollection().doc(eventId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing) {
    throw new AuthError(404, "EVENT_NOT_FOUND", "Login event not found.");
  }
  const nextNotes = [
    ...(existing.notes ?? []),
    { authorUid: actor.uid, note: note.trim(), createdAt: new Date().toISOString() },
  ];
  await ref.update({ notes: nextNotes });
  return { ...existing, notes: nextNotes };
}

export async function listSecuritySessions(
  actor: SessionUser,
  filters: {
    status?: string | undefined;
    role?: string | undefined;
    search?: string | undefined;
  } = {}
): Promise<SecuritySessionRecord[]> {
  assertSuperAdmin(actor);
  const snap = await securitySessionsCollection().get();
  const nowMs = Date.now();
  let items = snap.docs
    .map((d) => {
      const s = d.data();
      const effectiveStatus =
        s.status === "active" && Date.parse(s.expiresAt) <= nowMs ? "expired" : s.status;
      return { ...s, status: effectiveStatus };
    })
    .sort((a, b) => b.lastVerifiedAt.localeCompare(a.lastVerifiedAt));

  if (filters.status && filters.status !== "all") {
    items = items.filter((s) => s.status === filters.status);
  }
  if (filters.role && filters.role !== "all") {
    items = items.filter((s) => s.role === filters.role);
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    items = items.filter(
      (s) =>
        (s.email ?? "").toLowerCase().includes(q) ||
        s.userId.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.instituteId ?? "").toLowerCase().includes(q)
    );
  }
  return items.slice(0, 150);
}

export async function revokeSessionById(
  actor: SessionUser,
  input: { sessionId: string; reason: string }
): Promise<SecuritySessionRecord> {
  assertSuperAdmin(actor);
  if (!input.reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Revocation reason is required.");
  }
  const ref = securitySessionsCollection().doc(input.sessionId);
  const snap = await ref.get();
  const session = snap.data();
  if (!snap.exists || !session) {
    throw new AuthError(404, "SESSION_NOT_FOUND", "Session not found.");
  }
  if (session.userId === actor.uid) {
    throw new AuthError(
      400,
      "SELF_REVOCATION_BLOCKED",
      "Use Sign Out to end your own active session."
    );
  }

  const now = new Date().toISOString();
  await ref.update({
    status: "revoked",
    revokedAt: now,
    revokedByUid: actor.uid,
    revokeReason: input.reason.trim(),
  });
  await getAdminAuth()
    .revokeRefreshTokens(session.userId)
    .catch(() => undefined);

  await recordAuditLog({
    action: "SECURITY_SESSIONS_REVOKED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: session.instituteId,
    targetId: session.id,
    resourceType: "security_session",
    reason: input.reason.trim(),
    metadata: { targetUid: session.userId, sessionId: session.id },
  });

  return {
    ...session,
    status: "revoked",
    revokedAt: now,
    revokedByUid: actor.uid,
    revokeReason: input.reason.trim(),
  };
}

export async function revokeUserSessions(
  actor: SessionUser,
  input: { targetUid: string; reason: string }
): Promise<{ targetUid: string; revokedAt: string; sessionsRevoked: number }> {
  assertSuperAdmin(actor);
  if (!input.reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Session revocation reason is required.");
  }
  if (input.targetUid === actor.uid) {
    throw new AuthError(
      400,
      "SELF_REVOCATION_BLOCKED",
      "Use Sign Out to end your own active session."
    );
  }

  await getAdminAuth().revokeRefreshTokens(input.targetUid);
  const revokedAt = new Date().toISOString();

  const activeSnap = await securitySessionsCollection()
    .where("userId", "==", input.targetUid)
    .get();
  let sessionsRevoked = 0;
  for (const doc of activeSnap.docs) {
    if (doc.data().status === "active") {
      await doc.ref.update({
        status: "revoked",
        revokedAt,
        revokedByUid: actor.uid,
        revokeReason: input.reason.trim(),
      });
      sessionsRevoked += 1;
    }
  }

  const eventId = generateId("sec");
  await securityEventsCol()
    .doc(eventId)
    .set({
      id: eventId,
      type: "session_revoked",
      severity: "high",
      actorUid: actor.uid,
      targetUid: input.targetUid,
      summary: `Sessions revoked for ${input.targetUid}: ${input.reason.trim()}`,
      createdAt: revokedAt,
      resolved: true,
    });

  await recordAuditLog({
    action: "SECURITY_SESSIONS_REVOKED",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: input.targetUid,
    reason: input.reason.trim(),
    metadata: { revokedAt, sessionsRevoked },
  });

  return { targetUid: input.targetUid, revokedAt, sessionsRevoked };
}

export async function updateSecurityPolicyConfig(
  actor: SessionUser,
  input: Partial<
    Pick<
      SecurityPolicyConfig,
      | "sessionLifetimeDays"
      | "idleTimeoutMinutes"
      | "requireSuperAdminMfa"
      | "maxFailedLoginThreshold"
      | "failedLoginWindowMinutes"
      | "auditRetentionDays"
      | "loginEventRetentionDays"
    >
  >
): Promise<SecurityPolicyConfig> {
  assertSuperAdmin(actor);
  const current = await getSecurityPolicy();
  const next: SecurityPolicyConfig = {
    ...current,
    ...input,
    id: "policy",
    updatedAt: new Date().toISOString(),
    updatedByUid: actor.uid,
  };
  await securityPoliciesCollection().doc("policy").set(next);

  await recordAuditLog({
    action: "SECURITY_SESSIONS_REVOKED",
    actorUid: actor.uid,
    actorRole: actor.role,
    resourceType: "security_policy",
    targetId: "policy",
    reason: "Updated platform security policy",
    metadata: {
      sessionLifetimeDays: next.sessionLifetimeDays,
      idleTimeoutMinutes: next.idleTimeoutMinutes,
      requireSuperAdminMfa: next.requireSuperAdminMfa,
    },
  });
  return next;
}

export async function getAccessControlOverview(actor: SessionUser) {
  assertSuperAdmin(actor);
  const [overridesSnap, usersSnap, policy] = await Promise.all([
    userPermissionOverridesCollection().get(),
    usersCollection().limit(150).get(),
    getSecurityPolicy(),
  ]);

  return {
    roles: SYSTEM_ROLE_DEFINITIONS,
    permissions: PERMISSION_CATALOG,
    overrides: overridesSnap.docs.map((d) => d.data()),
    users: usersSnap.docs.map((d) => ({
      uid: d.data().uid,
      email: d.data().email,
      displayName: d.data().displayName,
      role: d.data().role,
      instituteId: d.data().instituteId,
      permissions: d.data().permissions,
      disabled: d.data().disabled,
    })),
    policy,
  };
}

export async function upsertUserPermissionOverride(
  actor: SessionUser,
  input: {
    targetUid: string;
    grantedPermissions: string[];
    revokedPermissions: string[];
    reason: string;
  }
): Promise<UserPermissionOverrideRecord> {
  assertSuperAdmin(actor);
  if (input.targetUid === actor.uid) {
    throw new AuthError(
      403,
      "SELF_ESCALATION_BLOCKED",
      "Cannot modify your own permissions."
    );
  }
  if (!input.reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Reason is required.");
  }

  const userSnap = await usersCollection().doc(input.targetUid).get();
  const targetUser = userSnap.data();
  if (!userSnap.exists || !targetUser) {
    throw new AuthError(404, "USER_NOT_FOUND", "Target user not found.");
  }
  if (targetUser.role === "super_admin") {
    throw new AuthError(
      403,
      "PRIVILEGED_ROLE_PROTECTED",
      "Super Admin permissions cannot be overridden via UI."
    );
  }

  const now = new Date().toISOString();
  const record: UserPermissionOverrideRecord = {
    uid: targetUser.uid,
    email: targetUser.email,
    role: targetUser.role,
    instituteId: targetUser.instituteId,
    grantedPermissions: input.grantedPermissions,
    revokedPermissions: input.revokedPermissions,
    reason: input.reason.trim(),
    updatedAt: now,
    updatedByUid: actor.uid,
  };

  await userPermissionOverridesCollection().doc(targetUser.uid).set(record);

  await recordAuditLog({
    action: "ENTITLEMENT_OVERRIDE_SET",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: targetUser.instituteId,
    targetId: targetUser.uid,
    resourceType: "permission_override",
    reason: input.reason.trim(),
    metadata: {
      granted: input.grantedPermissions.join(","),
      revoked: input.revokedPermissions.join(","),
    },
  });

  return record;
}

export async function listAuditLogsPaginated(
  actor: SessionUser,
  filters: {
    search?: string | undefined;
    action?: string | undefined;
    actorRole?: string | undefined;
    instituteId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
  } = {}
) {
  assertSuperAdmin(actor);
  const snap = await auditLogsCollection().orderBy("createdAt", "desc").limit(300).get();
  let items = snap.docs.map((d) => d.data());

  if (filters.action && filters.action !== "all") {
    items = items.filter((i) => i.action === filters.action);
  }
  if (filters.actorRole && filters.actorRole !== "all") {
    items = items.filter((i) => i.actorRole === filters.actorRole);
  }
  if (filters.instituteId) {
    items = items.filter((i) => i.instituteId === filters.instituteId);
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.id.toLowerCase().includes(q) ||
        i.action.toLowerCase().includes(q) ||
        i.actorUid.toLowerCase().includes(q) ||
        (i.instituteId ?? "").toLowerCase().includes(q) ||
        (i.targetId ?? "").toLowerCase().includes(q)
    );
  }

  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(Math.max(filters.page ?? 1, 1), totalPages);
  const offset = (page - 1) * pageSize;

  return {
    items: items.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function listSecurityAlertsAndRules(
  actor: SessionUser,
  filters: {
    status?: string | undefined;
    severity?: string | undefined;
    search?: string | undefined;
  } = {}
) {
  assertSuperAdmin(actor);
  const [alertsSnap, rules] = await Promise.all([
    securityAlertsCollection().get(),
    listAlertRules(),
  ]);

  let alerts = alertsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  if (filters.status && filters.status !== "all") {
    alerts = alerts.filter((a) => a.status === filters.status);
  }
  if (filters.severity && filters.severity !== "all") {
    alerts = alerts.filter((a) => a.severity === filters.severity);
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    alerts = alerts.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        (a.relatedEmail ?? "").toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    );
  }

  return { alerts, rules };
}

export async function updateSecurityAlertLifecycle(
  actor: SessionUser,
  input: {
    alertId: string;
    action: "acknowledge" | "investigate" | "resolve" | "false_positive" | "add_note";
    note?: string | undefined;
    reason?: string | undefined;
  }
): Promise<SecurityAlertRecord> {
  assertSuperAdmin(actor);
  const ref = securityAlertsCollection().doc(input.alertId);
  const snap = await ref.get();
  const alert = snap.data();
  if (!snap.exists || !alert) {
    throw new AuthError(404, "ALERT_NOT_FOUND", "Security alert not found.");
  }

  const now = new Date().toISOString();
  const statusMap: Record<string, SecurityAlertStatus> = {
    acknowledge: "acknowledged",
    investigate: "investigating",
    resolve: "resolved",
    false_positive: "false_positive",
  };
  const nextStatus = statusMap[input.action] ?? alert.status;
  const nextNotes = input.note?.trim()
    ? [
        ...(alert.notes ?? []),
        { authorUid: actor.uid, note: input.note.trim(), createdAt: now },
      ]
    : alert.notes;

  const patch: Partial<SecurityAlertRecord> = {
    status: nextStatus,
    notes: nextNotes,
    assignedToUid: alert.assignedToUid ?? actor.uid,
    ...(input.reason?.trim() ? { resolutionReason: input.reason.trim() } : {}),
    updatedAt: now,
  };

  await ref.update(patch);

  await recordAuditLog({
    action: "INCIDENT_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: alert.relatedInstituteId,
    targetId: alert.id,
    resourceType: "security_alert",
    reason: input.reason?.trim() ?? input.action,
    metadata: { status: nextStatus },
  });

  return { ...alert, ...patch };
}

export async function updateSecurityAlertRuleConfig(
  actor: SessionUser,
  input: {
    id: string;
    enabled: boolean;
    threshold: number;
    windowMinutes: number;
    cooldownMinutes: number;
    severity: SecurityAlertSeverity;
  }
): Promise<SecurityAlertRuleRecord> {
  assertSuperAdmin(actor);
  const ref = securityAlertRulesCollection().doc(input.id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing) {
    throw new AuthError(404, "RULE_NOT_FOUND", "Alert rule not found.");
  }

  const next: SecurityAlertRuleRecord = {
    ...existing,
    enabled: input.enabled,
    threshold: input.threshold,
    windowMinutes: input.windowMinutes,
    cooldownMinutes: input.cooldownMinutes,
    severity: input.severity,
    updatedAt: new Date().toISOString(),
    updatedByUid: actor.uid,
  };
  await ref.set(next);

  await recordAuditLog({
    action: "FEATURE_FLAG_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    resourceType: "security_alert_rule",
    targetId: next.id,
    metadata: { enabled: next.enabled, threshold: next.threshold },
  });

  return next;
}
