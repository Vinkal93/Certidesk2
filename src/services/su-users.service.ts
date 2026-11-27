import "server-only";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  institutesCollection,
  loginMappingsCollection,
  securityLoginEventsCollection,
  securitySessionsCollection,
  studentsCollection,
  usersCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { recordAuditLog } from "./audit.service";
import type { SessionUser, UserRole } from "@/types/auth";
import type { SecurityLoginEventRecord, SecuritySessionRecord } from "@/types/security";

export interface PlatformUserSummary {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  instituteId: string | null;
  instituteName: string | null;
  instituteCode: string | null;
  studentId: string | null;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastLoginStatus: "success" | "failed" | "blocked" | null;
}

export interface PlatformUserKpis {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  instituteAdmins: number;
  staff: number;
  students: number;
  superAdmins: number;
}

export type UserControlAction = "block" | "unblock" | "force_logout" | "delete";

function assertSuperAdmin(actor: SessionUser) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
}

export function validateUserControlTarget(params: {
  actorUid: string;
  targetUid: string;
  targetRole: UserRole;
  action: UserControlAction;
}) {
  if (params.actorUid === params.targetUid) {
    throw new AuthError(
      400,
      "SELF_ACTION_BLOCKED",
      "You cannot block, force-logout, or delete your own active Super Admin account."
    );
  }
  if (params.targetRole === "super_admin" && params.action === "delete") {
    throw new AuthError(
      403,
      "SUPER_ADMIN_PROTECTED",
      "Super Admin accounts cannot be deleted from the user directory."
    );
  }
}

export async function listAllPlatformUsers(actor: SessionUser): Promise<{
  users: PlatformUserSummary[];
  institutes: { id: string; name: string; code: string }[];
  kpis: PlatformUserKpis;
}> {
  assertSuperAdmin(actor);

  const [usersSnap, institutesSnap, loginEventsSnap] = await Promise.all([
    usersCollection().get(),
    institutesCollection().get(),
    securityLoginEventsCollection().orderBy("timestamp", "desc").limit(300).get(),
  ]);

  const instituteMap = new Map<string, { id: string; name: string; code: string }>();
  for (const doc of institutesSnap.docs) {
    const inst = doc.data();
    instituteMap.set(inst.id, { id: inst.id, name: inst.name, code: inst.code });
  }

  const latestLoginByUid = new Map<
    string,
    { timestamp: string; result: "success" | "failed" | "blocked" }
  >();
  for (const doc of loginEventsSnap.docs) {
    const ev = doc.data();
    if (ev.userId && !latestLoginByUid.has(ev.userId)) {
      latestLoginByUid.set(ev.userId, { timestamp: ev.timestamp, result: ev.result });
    }
  }

  const users: PlatformUserSummary[] = usersSnap.docs
    .map((doc) => {
      const u = doc.data();
      const inst = u.instituteId ? instituteMap.get(u.instituteId) : undefined;
      const loginInfo = latestLoginByUid.get(u.uid);
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || u.email,
        role: u.role,
        instituteId: u.instituteId ?? null,
        instituteName: inst?.name ?? null,
        instituteCode: inst?.code ?? null,
        studentId: u.studentId ?? null,
        disabled: Boolean(u.disabled),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLoginAt: loginInfo?.timestamp ?? null,
        lastLoginStatus: loginInfo?.result ?? null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const kpis: PlatformUserKpis = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => !u.disabled).length,
    blockedUsers: users.filter((u) => u.disabled).length,
    instituteAdmins: users.filter((u) => u.role === "institute_admin").length,
    staff: users.filter((u) => u.role === "staff").length,
    students: users.filter((u) => u.role === "student").length,
    superAdmins: users.filter((u) => u.role === "super_admin").length,
  };

  return {
    users,
    institutes: Array.from(instituteMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    kpis,
  };
}

export async function getUserLoginHistory(
  actor: SessionUser,
  uid: string
): Promise<{
  user: PlatformUserSummary;
  events: SecurityLoginEventRecord[];
  sessions: SecuritySessionRecord[];
}> {
  assertSuperAdmin(actor);

  const userDoc = await usersCollection().doc(uid).get();
  if (!userDoc.exists) {
    throw new AuthError(404, "USER_NOT_FOUND", "User record not found.");
  }
  const u = userDoc.data()!;
  let instName: string | null = null;
  let instCode: string | null = null;
  if (u.instituteId) {
    const instDoc = await institutesCollection().doc(u.instituteId).get();
    if (instDoc.exists) {
      instName = instDoc.data()!.name;
      instCode = instDoc.data()!.code;
    }
  }

  const [eventsSnap, sessionsSnap] = await Promise.all([
    securityLoginEventsCollection().where("userId", "==", uid).get(),
    securitySessionsCollection().where("userId", "==", uid).get(),
  ]);

  const events = eventsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 50);

  const sessions = sessionsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.lastVerifiedAt.localeCompare(a.lastVerifiedAt))
    .slice(0, 25);

  return {
    user: {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || u.email,
      role: u.role,
      instituteId: u.instituteId ?? null,
      instituteName: instName,
      instituteCode: instCode,
      studentId: u.studentId ?? null,
      disabled: Boolean(u.disabled),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: events[0]?.timestamp ?? null,
      lastLoginStatus: events[0]?.result ?? null,
    },
    events,
    sessions,
  };
}

async function revokeSessionsForUid(uid: string, actorUid: string, now: string) {
  const sessionsSnap = await securitySessionsCollection()
    .where("userId", "==", uid)
    .where("status", "==", "active")
    .get();
  if (sessionsSnap.empty) return 0;

  const batch = sessionsSnap.docs[0]!.ref.firestore.batch();
  for (const doc of sessionsSnap.docs) {
    batch.update(doc.ref, {
      status: "revoked",
      revokedAt: now,
      revokedByUid: actorUid,
    });
  }
  await batch.commit();
  return sessionsSnap.size;
}

export async function performUserControlAction(
  actor: SessionUser,
  input: { uid: string; action: UserControlAction; reason?: string }
): Promise<{
  uid: string;
  action: UserControlAction;
  revokedSessions?: number;
}> {
  assertSuperAdmin(actor);

  const userRef = usersCollection().doc(input.uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new AuthError(404, "USER_NOT_FOUND", "User record not found.");
  }
  const target = userSnap.data()!;
  validateUserControlTarget({
    actorUid: actor.uid,
    targetUid: input.uid,
    targetRole: target.role,
    action: input.action,
  });

  const now = new Date().toISOString();
  const auth = getAdminAuth();
  const reason = input.reason?.trim() || "Super Admin directory action";

  if (input.action === "block" || input.action === "unblock") {
    const disabled = input.action === "block";
    try {
      await auth.updateUser(input.uid, { disabled });
      if (disabled) {
        await auth.revokeRefreshTokens(input.uid);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/user-not-found") {
        throw err;
      }
    }

    await userRef.update({ disabled, updatedAt: now });

    const mappingsSnap = await loginMappingsCollection()
      .where("uid", "==", input.uid)
      .get();
    if (!mappingsSnap.empty) {
      const batch = mappingsSnap.docs[0]!.ref.firestore.batch();
      for (const doc of mappingsSnap.docs) {
        batch.update(doc.ref, { active: !disabled, updatedAt: now });
      }
      await batch.commit();
    }

    const revokedSessions = disabled
      ? await revokeSessionsForUid(input.uid, actor.uid, now)
      : 0;

    await recordAuditLog({
      action: disabled ? "USER_BLOCKED" : "USER_UNBLOCKED",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId: target.instituteId ?? null,
      targetId: input.uid,
      metadata: {
        email: target.email,
        role: target.role,
        reason,
        revokedSessions,
      },
    });

    return { uid: input.uid, action: input.action, revokedSessions };
  }

  if (input.action === "force_logout") {
    try {
      await auth.revokeRefreshTokens(input.uid);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/user-not-found") {
        throw err;
      }
    }
    const revokedSessions = await revokeSessionsForUid(input.uid, actor.uid, now);

    await recordAuditLog({
      action: "USER_FORCE_LOGOUT",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId: target.instituteId ?? null,
      targetId: input.uid,
      metadata: {
        email: target.email,
        role: target.role,
        reason,
        revokedSessions,
      },
    });

    return { uid: input.uid, action: input.action, revokedSessions };
  }

  // action === "delete"
  try {
    await auth.revokeRefreshTokens(input.uid);
    await auth.deleteUser(input.uid);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== "auth/user-not-found") {
      throw err;
    }
  }

  const revokedSessions = await revokeSessionsForUid(input.uid, actor.uid, now);

  const mappingsSnap = await loginMappingsCollection()
    .where("uid", "==", input.uid)
    .get();
  if (!mappingsSnap.empty) {
    const batch = mappingsSnap.docs[0]!.ref.firestore.batch();
    for (const doc of mappingsSnap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  if (target.studentId) {
    const studentRef = studentsCollection().doc(target.studentId);
    const studentSnap = await studentRef.get();
    if (studentSnap.exists) {
      await studentRef.update({ status: "disabled", updatedAt: now });
    }
  }

  await userRef.delete();

  await recordAuditLog({
    action: "USER_DELETED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: target.instituteId ?? null,
    targetId: input.uid,
    metadata: {
      email: target.email,
      displayName: target.displayName,
      role: target.role,
      reason,
      revokedSessions,
    },
  });

  return { uid: input.uid, action: input.action, revokedSessions };
}
