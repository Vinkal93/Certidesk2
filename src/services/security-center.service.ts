import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
  auditLogsCollection,
  usersCollection,
  webhookEventsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";

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

export async function getSecurityCenterOverview(actor: SessionUser) {
  assertSuperAdmin(actor);

  const [auditSnap, webhooksSnap, usersSnap, eventsSnap] = await Promise.all([
    auditLogsCollection().orderBy("createdAt", "desc").limit(100).get(),
    webhookEventsCollection().orderBy("receivedAt", "desc").limit(50).get(),
    usersCollection().limit(150).get(),
    securityEventsCol().orderBy("createdAt", "desc").limit(50).get(),
  ]);

  const audits = auditSnap.docs.map((d) => d.data());
  const loginAudits = audits.filter(
    (a) =>
      a.action.startsWith("AUTH_") ||
      a.action === "SECURITY_SESSIONS_REVOKED" ||
      a.action === "PASSWORD_CHANGED"
  );
  const failedLogins = audits.filter((a) => a.action === "AUTH_LOGIN_REJECTED");

  const webhooks = webhooksSnap.docs.map((d) => d.data());
  const rejectedWebhooks = webhooks.filter(
    (w) => w.status === "rejected" || w.status === "failed"
  );

  const users = usersSnap.docs.map((d) => d.data());
  const securityEvents = eventsSnap.docs.map((d) => d.data());

  return {
    metrics: {
      trackedAuthEvents: loginAudits.length,
      failedLoginEvents: failedLogins.length,
      rejectedWebhooks: rejectedWebhooks.length,
      openSecurityEvents: securityEvents.filter((e) => !e.resolved).length,
      activeUsersTracked: users.filter((u) => !u.disabled).length,
    },
    loginAudits: loginAudits.slice(0, 40),
    rejectedWebhooks: rejectedWebhooks.slice(0, 20),
    securityEvents,
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
      .slice(0, 80),
  };
}

export async function revokeUserSessions(
  actor: SessionUser,
  input: { targetUid: string; reason: string }
): Promise<{ targetUid: string; revokedAt: string }> {
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

  const eventId = generateId("sec");
  const secEvent: SecurityEventRecord = {
    id: eventId,
    type: "session_revoked",
    severity: "high",
    actorUid: actor.uid,
    targetUid: input.targetUid,
    summary: `Sessions revoked for ${input.targetUid}: ${input.reason.trim()}`,
    createdAt: revokedAt,
    resolved: true,
  };

  await securityEventsCol().doc(eventId).set(secEvent);

  await recordAuditLog({
    action: "SECURITY_SESSIONS_REVOKED",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: input.targetUid,
    metadata: {
      reason: input.reason.trim(),
      revokedAt,
    },
  });

  return { targetUid: input.targetUid, revokedAt };
}
