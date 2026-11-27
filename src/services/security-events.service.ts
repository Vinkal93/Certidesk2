import "server-only";
import {
  securityAlertRulesCollection,
  securityAlertsCollection,
  securityLoginEventsCollection,
  securityPoliciesCollection,
} from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { UserRole } from "@/types/auth";
import type {
  LoginEventResult,
  SecurityAlertRecord,
  SecurityAlertRuleRecord,
  SecurityAlertSeverity,
  SecurityLoginEventRecord,
  SecurityPolicyConfig,
} from "@/types/security";

export const DEFAULT_SECURITY_POLICY: Omit<
  SecurityPolicyConfig,
  "updatedAt" | "updatedByUid"
> = {
  id: "policy",
  sessionLifetimeDays: 5,
  idleTimeoutMinutes: 60,
  requireSuperAdminMfa: true,
  maxFailedLoginThreshold: 5,
  failedLoginWindowMinutes: 15,
  auditRetentionDays: 365,
  loginEventRetentionDays: 90,
};

export const DEFAULT_ALERT_RULES: Array<
  Omit<SecurityAlertRuleRecord, "updatedAt" | "updatedByUid">
> = [
  {
    id: "RULE_FAILED_LOGINS",
    name: "Repeated Login Failures",
    description:
      "Triggers when an account has N or more failed login attempts within the evaluation window.",
    category: "repeated_login_failures",
    enabled: true,
    threshold: 5,
    windowMinutes: 15,
    cooldownMinutes: 30,
    severity: "high",
  },
  {
    id: "RULE_MULTI_ACCOUNT_IP",
    name: "Multiple Account Failures from Same IP",
    description:
      "Triggers when multiple distinct accounts fail authentication from the same IP address.",
    category: "multiple_account_ip_failures",
    enabled: true,
    threshold: 3,
    windowMinutes: 15,
    cooldownMinutes: 30,
    severity: "critical",
  },
  {
    id: "RULE_CROSS_TENANT_ACCESS",
    name: "Cross-Tenant or Unauthorized Access Attempt",
    description:
      "Triggers when a user attempts to access another institute or privileged resource without authorization.",
    category: "cross_tenant_access",
    enabled: true,
    threshold: 1,
    windowMinutes: 15,
    cooldownMinutes: 15,
    severity: "critical",
  },
  {
    id: "RULE_WEBHOOK_FAILURES",
    name: "Repeated Webhook Signature Failures",
    description:
      "Triggers when Razorpay webhook signature verification fails repeatedly.",
    category: "webhook_signature_failures",
    enabled: true,
    threshold: 3,
    windowMinutes: 30,
    cooldownMinutes: 30,
    severity: "high",
  },
  {
    id: "RULE_SUSPICIOUS_WALLET",
    name: "Large or Unusual Manual Wallet Adjustment",
    description:
      "Triggers on high-value manual Super Admin wallet adjustments (>= ₹10,000).",
    category: "suspicious_wallet_adjustment",
    enabled: true,
    threshold: 1000000,
    windowMinutes: 60,
    cooldownMinutes: 10,
    severity: "medium",
  },
  {
    id: "RULE_PRIVILEGED_NO_MFA",
    name: "Privileged Account Access Without MFA",
    description: "Triggers when a Super Admin signs in without Firebase MFA enrolled.",
    category: "privileged_no_mfa",
    enabled: true,
    threshold: 1,
    windowMinutes: 60,
    cooldownMinutes: 120,
    severity: "high",
  },
];

export async function getSecurityPolicy(): Promise<SecurityPolicyConfig> {
  const snap = await securityPoliciesCollection().doc("policy").get();
  if (snap.exists && snap.data()) {
    return snap.data()!;
  }
  const now = new Date().toISOString();
  const seeded: SecurityPolicyConfig = {
    ...DEFAULT_SECURITY_POLICY,
    updatedAt: now,
    updatedByUid: "system_seed",
  };
  await securityPoliciesCollection().doc("policy").set(seeded);
  return seeded;
}

export async function ensureDefaultAlertRulesSeeded(): Promise<void> {
  const snap = await securityAlertRulesCollection().get();
  if (!snap.empty) return;
  const now = new Date().toISOString();
  await Promise.all(
    DEFAULT_ALERT_RULES.map((rule) =>
      securityAlertRulesCollection()
        .doc(rule.id)
        .set({
          ...rule,
          updatedAt: now,
          updatedByUid: "system_seed",
        })
    )
  );
}

export async function listAlertRules(): Promise<SecurityAlertRuleRecord[]> {
  await ensureDefaultAlertRulesSeeded();
  const snap = await securityAlertRulesCollection().get();
  return snap.docs.map((d) => d.data()).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Pure helper to check whether an existing alert falls inside the deduplication cooldown window.
 * Exported for unit testing.
 */
export function shouldDeduplicateAlert(
  existing: Pick<SecurityAlertRecord, "status" | "lastSeenAt">,
  cooldownMinutes: number,
  nowMs = Date.now()
): boolean {
  if (existing.status === "resolved" || existing.status === "false_positive") {
    return false;
  }
  const lastMs = Date.parse(existing.lastSeenAt);
  if (Number.isNaN(lastMs)) return false;
  return nowMs - lastMs <= cooldownMinutes * 60 * 1000;
}

export async function emitAlertWithDeduplication(params: {
  ruleId: string;
  dedupKey: string;
  severity: SecurityAlertSeverity;
  category: string;
  title: string;
  summary: string;
  relatedUid?: string | null;
  relatedEmail?: string | null;
  relatedInstituteId?: string | null;
  eventId?: string | null;
  cooldownMinutes?: number;
}): Promise<{ alert: SecurityAlertRecord; deduplicated: boolean }> {
  const now = new Date().toISOString();
  const cooldown = params.cooldownMinutes ?? 30;

  const existingSnap = await securityAlertsCollection()
    .where("dedupKey", "==", params.dedupKey)
    .get();
  const openMatch = existingSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
    .find((a) => shouldDeduplicateAlert(a, cooldown));

  if (openMatch) {
    const nextEvents = params.eventId
      ? Array.from(new Set([...openMatch.relatedEvents, params.eventId])).slice(-25)
      : openMatch.relatedEvents;
    const nextCount = openMatch.eventCount + 1;
    await securityAlertsCollection().doc(openMatch.id).update({
      lastSeenAt: now,
      eventCount: nextCount,
      relatedEvents: nextEvents,
      updatedAt: now,
    });
    return {
      alert: {
        ...openMatch,
        lastSeenAt: now,
        eventCount: nextCount,
        relatedEvents: nextEvents,
        updatedAt: now,
      },
      deduplicated: true,
    };
  }

  const alertId = generateId("ALT");
  const alert: SecurityAlertRecord = {
    id: alertId,
    ruleId: params.ruleId,
    dedupKey: params.dedupKey,
    severity: params.severity,
    category: params.category,
    title: params.title,
    summary: params.summary,
    status: "new",
    relatedUid: params.relatedUid ?? null,
    relatedEmail: params.relatedEmail ?? null,
    relatedInstituteId: params.relatedInstituteId ?? null,
    relatedEvents: params.eventId ? [params.eventId] : [],
    firstSeenAt: now,
    lastSeenAt: now,
    eventCount: 1,
    assignedToUid: null,
    notes: [],
    resolutionReason: null,
    createdAt: now,
    updatedAt: now,
  };

  await securityAlertsCollection().doc(alertId).set(alert);
  return { alert, deduplicated: false };
}

export async function recordLoginEvent(params: {
  userId?: string | null;
  identifier: string;
  role: UserRole | "unknown";
  instituteId?: string | null;
  authMethod: "password" | "id_token" | "session_cookie";
  result: LoginEventResult;
  failureCategory?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string;
  sessionId?: string | null;
  mfaEnrolled?: boolean;
}): Promise<SecurityLoginEventRecord> {
  const now = new Date().toISOString();
  const eventId = generateId("LGN");
  const record: SecurityLoginEventRecord = {
    id: eventId,
    userId: params.userId ?? null,
    identifier: params.identifier.trim().slice(0, 120),
    role: params.role,
    instituteId: params.instituteId ?? null,
    timestamp: now,
    authMethod: params.authMethod,
    result: params.result,
    failureCategory: params.failureCategory ?? null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ? params.userAgent.slice(0, 240) : null,
    correlationId: params.correlationId ?? generateId("COR"),
    sessionId: params.sessionId ?? null,
    notes: [],
  };

  await securityLoginEventsCollection().doc(eventId).set(record);

  // Evaluate detection rules safely without breaking auth flow
  try {
    const rules = await listAlertRules();
    const ruleMap = new Map(rules.map((r) => [r.id, r]));

    if (params.result === "failed" || params.result === "blocked") {
      const failedRule = ruleMap.get("RULE_FAILED_LOGINS");
      if (failedRule?.enabled) {
        const cutoff = new Date(
          Date.now() - failedRule.windowMinutes * 60 * 1000
        ).toISOString();
        const recentSnap = await securityLoginEventsCollection()
          .where("identifier", "==", record.identifier)
          .get();
        const recentFailures = recentSnap.docs
          .map((d) => d.data())
          .filter(
            (e) =>
              (e.result === "failed" || e.result === "blocked") && e.timestamp >= cutoff
          );
        if (recentFailures.length >= failedRule.threshold) {
          await emitAlertWithDeduplication({
            ruleId: failedRule.id,
            dedupKey: `failed_login_${record.identifier}`,
            severity: failedRule.severity,
            category: failedRule.category,
            title: `Repeated login failures for ${record.identifier}`,
            summary: `${recentFailures.length} failed/blocked login attempts detected within ${failedRule.windowMinutes} minutes.`,
            relatedUid: record.userId,
            relatedEmail: record.identifier,
            relatedInstituteId: record.instituteId,
            eventId,
            cooldownMinutes: failedRule.cooldownMinutes,
          });
        }
      }

      const ipRule = ruleMap.get("RULE_MULTI_ACCOUNT_IP");
      if (ipRule?.enabled && record.ipAddress) {
        const cutoff = new Date(
          Date.now() - ipRule.windowMinutes * 60 * 1000
        ).toISOString();
        const ipSnap = await securityLoginEventsCollection()
          .where("ipAddress", "==", record.ipAddress)
          .get();
        const distinctAccounts = new Set(
          ipSnap.docs
            .map((d) => d.data())
            .filter(
              (e) =>
                (e.result === "failed" || e.result === "blocked") && e.timestamp >= cutoff
            )
            .map((e) => e.identifier)
        );
        if (distinctAccounts.size >= ipRule.threshold) {
          await emitAlertWithDeduplication({
            ruleId: ipRule.id,
            dedupKey: `multi_acct_ip_${record.ipAddress}`,
            severity: ipRule.severity,
            category: ipRule.category,
            title: `Multiple account login failures from IP ${record.ipAddress}`,
            summary: `${distinctAccounts.size} distinct accounts failed login from ${record.ipAddress} within ${ipRule.windowMinutes} minutes.`,
            relatedInstituteId: record.instituteId,
            eventId,
            cooldownMinutes: ipRule.cooldownMinutes,
          });
        }
      }
    }

    if (
      params.result === "success" &&
      params.role === "super_admin" &&
      params.mfaEnrolled === false
    ) {
      const mfaRule = ruleMap.get("RULE_PRIVILEGED_NO_MFA");
      if (mfaRule?.enabled) {
        await emitAlertWithDeduplication({
          ruleId: mfaRule.id,
          dedupKey: `no_mfa_${record.userId ?? record.identifier}`,
          severity: mfaRule.severity,
          category: mfaRule.category,
          title: `Super Admin sign-in without MFA (${record.identifier})`,
          summary: `Privileged account ${record.identifier} signed in without enrolled Firebase MFA factors.`,
          relatedUid: record.userId,
          relatedEmail: record.identifier,
          eventId,
          cooldownMinutes: mfaRule.cooldownMinutes,
        });
      }
    }
  } catch {
    // Alert evaluation must never break authentication
  }

  return record;
}

export async function recordSecurityViolationAlert(params: {
  ruleId: string;
  dedupKey: string;
  severity: SecurityAlertSeverity;
  category: string;
  title: string;
  summary: string;
  actorUid?: string | null;
  actorEmail?: string | null;
  instituteId?: string | null;
}): Promise<void> {
  try {
    await emitAlertWithDeduplication({
      ruleId: params.ruleId,
      dedupKey: params.dedupKey,
      severity: params.severity,
      category: params.category,
      title: params.title,
      summary: params.summary,
      relatedUid: params.actorUid ?? null,
      relatedEmail: params.actorEmail ?? null,
      relatedInstituteId: params.instituteId ?? null,
    });
    await recordAuditLog({
      action: "AUTH_LOGIN_REJECTED",
      actorUid: params.actorUid ?? "anonymous",
      actorRole: "system",
      instituteId: params.instituteId ?? null,
      reason: params.summary,
      result: "failure",
      metadata: { category: params.category, ruleId: params.ruleId },
    });
  } catch {
    // Non-blocking
  }
}
