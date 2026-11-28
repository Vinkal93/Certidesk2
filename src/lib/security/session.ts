import "server-only";
import { cookies } from "next/headers";
import { getServerEnv } from "@/config/env.server";
import {
  createFirebaseSessionCookie,
  getAdminUserByUid,
  revokeUserRefreshTokens,
  verifyFirebaseSessionCookie,
} from "@/lib/firebase/auth";
import {
  institutesCollection,
  securitySessionsCollection,
  studentsCollection,
  usersCollection,
} from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import { extractSessionUserFromClaims, isRoleAllowedInPortal } from "./permissions";
import type { PortalType, SessionUser } from "@/types/auth";

export const SESSION_ID_COOKIE_NAME = "cd_sid";

export class AuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getSessionCookieConfig() {
  const env = getServerEnv();
  const maxAgeSeconds = env.SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60;
  return {
    name: env.SESSION_COOKIE_NAME,
    maxAgeSeconds,
    expiresInMs: maxAgeSeconds * 1000,
    options: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: maxAgeSeconds,
    },
  };
}

export async function createAndSetSessionCookie(
  idToken: string,
  meta?: {
    userId?: string;
    email?: string | null;
    role?: SessionUser["role"];
    instituteId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<string> {
  const config = getSessionCookieConfig();
  const sessionCookie = await createFirebaseSessionCookie(idToken, config.expiresInMs);
  const cookieStore = await cookies();
  cookieStore.set(config.name, sessionCookie, config.options);

  const sessionId = generateId("SES");
  cookieStore.set(SESSION_ID_COOKIE_NAME, sessionId, config.options);

  if (meta?.userId && meta?.role) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.expiresInMs).toISOString();
    await securitySessionsCollection()
      .doc(sessionId)
      .set({
        id: sessionId,
        userId: meta.userId,
        email: meta.email ?? null,
        role: meta.role,
        instituteId: meta.instituteId ?? null,
        createdAt: now.toISOString(),
        lastVerifiedAt: now.toISOString(),
        expiresAt,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ? meta.userAgent.slice(0, 240) : null,
        status: "active",
        revokedAt: null,
        revokedByUid: null,
        revokeReason: null,
      })
      .catch(() => undefined);
  }

  return sessionId;
}

export async function clearSessionCookie(): Promise<void> {
  const config = getSessionCookieConfig();
  const cookieStore = await cookies();
  const sid = cookieStore.get(SESSION_ID_COOKIE_NAME)?.value;
  if (sid) {
    await securitySessionsCollection()
      .doc(sid)
      .update({
        status: "revoked",
        revokedAt: new Date().toISOString(),
        revokeReason: "User logout",
      })
      .catch(() => undefined);
  }
  cookieStore.set(config.name, "", {
    ...config.options,
    maxAge: 0,
  });
  cookieStore.set(SESSION_ID_COOKIE_NAME, "", {
    ...config.options,
    maxAge: 0,
  });
}

export async function revokeSessionAndClearCookie(uid?: string): Promise<void> {
  if (uid) {
    await revokeUserRefreshTokens(uid).catch(() => undefined);
  }
  await clearSessionCookie();
}

export function isAllowlistedSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = getServerEnv().SUPER_ADMIN_EMAILS;
  if (!raw) return false;
  const normalized = email.trim().toLowerCase();
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

/**
 * Verifies the HTTP-only session cookie via Firebase Admin SDK (`checkRevoked = true`)
 * and validates that the account & parent institute remain active.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const config = getSessionCookieConfig();
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(config.name)?.value;
    const sid = cookieStore.get(SESSION_ID_COOKIE_NAME)?.value;

    if (!rawCookie) {
      return null;
    }

    if (sid) {
      const sessionSnap = await securitySessionsCollection()
        .doc(sid)
        .get()
        .catch(() => null);
      const sessionDoc = sessionSnap?.data();
      if (sessionSnap?.exists && sessionDoc) {
        if (sessionDoc.status === "revoked") {
          return null;
        }
        if (
          sessionDoc.status === "expired" ||
          Date.parse(sessionDoc.expiresAt) <= Date.now()
        ) {
          if (sessionDoc.status !== "expired") {
            await securitySessionsCollection()
              .doc(sid)
              .update({ status: "expired" })
              .catch(() => undefined);
          }
          return null;
        }
        const lastVerifiedMs = Date.parse(
          sessionDoc.lastVerifiedAt || sessionDoc.createdAt
        );
        if (!Number.isFinite(lastVerifiedMs) || Date.now() - lastVerifiedMs > 60_000) {
          void securitySessionsCollection()
            .doc(sid)
            .update({ lastVerifiedAt: new Date().toISOString() })
            .catch(() => undefined);
        }
      }
    }

    const decoded = await verifyFirebaseSessionCookie(rawCookie, true);
    let sessionUser = extractSessionUserFromClaims({
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      instituteId: decoded.instituteId,
      studentId: decoded.studentId,
      permissions: decoded.permissions,
      mustChangePassword: decoded.mustChangePassword,
    });

    if (!sessionUser && !decoded.role && isAllowlistedSuperAdminEmail(decoded.email)) {
      sessionUser = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        role: "super_admin",
        instituteId: null,
        studentId: null,
        permissions: [],
        mustChangePassword: false,
      };
    }

    if (!sessionUser) {
      return null;
    }

    const authUser = await getAdminUserByUid(sessionUser.uid);
    if (authUser.disabled) {
      await revokeUserRefreshTokens(sessionUser.uid).catch(() => undefined);
      return null;
    }

    // Cross-check Firestore user profile disabled state
    const userDoc = await usersCollection().doc(sessionUser.uid).get();
    if (userDoc.exists && userDoc.data()?.disabled) {
      await revokeUserRefreshTokens(sessionUser.uid).catch(() => undefined);
      return null;
    }

    // For institute-scoped roles, verify parent institute is active
    if (sessionUser.role !== "super_admin") {
      if (!sessionUser.instituteId) {
        return null;
      }
      const instituteDoc = await institutesCollection()
        .doc(sessionUser.instituteId)
        .get();
      const institute = instituteDoc.data();
      if (!instituteDoc.exists || !institute || institute.status !== "active") {
        await revokeUserRefreshTokens(sessionUser.uid).catch(() => undefined);
        return null;
      }
    }

    // For students, verify student record is active and belongs to the same institute
    if (sessionUser.role === "student") {
      if (!sessionUser.studentId || !sessionUser.instituteId) {
        return null;
      }
      const studentDoc = await studentsCollection().doc(sessionUser.studentId).get();
      const student = studentDoc.data();
      if (
        !studentDoc.exists ||
        !student ||
        student.status !== "active" ||
        student.instituteId !== sessionUser.instituteId
      ) {
        await revokeUserRefreshTokens(sessionUser.uid).catch(() => undefined);
        return null;
      }
    }

    if (sid) {
      await securitySessionsCollection()
        .doc(sid)
        .update({ lastVerifiedAt: new Date().toISOString() })
        .catch(() => undefined);
    }

    return sessionUser;
  } catch {
    return null;
  }
}

import { getSuperAdminImpressionInstituteId } from "./impression";

export async function getInstitutePortalSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role === "institute_admin" || user.role === "staff") {
    return user;
  }
  if (user.role === "super_admin") {
    const impressionId = await getSuperAdminImpressionInstituteId();
    if (impressionId) {
      return {
        ...user,
        instituteId: impressionId,
      };
    }
  }
  return null;
}

export async function requireSessionUser(
  requiredPortal?: PortalType
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError(401, "UNAUTHORIZED", "Authentication required.");
  }

  if (requiredPortal === "institute" && user.role === "super_admin") {
    const impressionId = await getSuperAdminImpressionInstituteId();
    if (impressionId) {
      return {
        ...user,
        instituteId: impressionId,
      };
    }
  }

  if (requiredPortal && !isRoleAllowedInPortal(user.role, requiredPortal)) {
    throw new AuthError(
      403,
      "FORBIDDEN_PORTAL",
      "Your account is not authorized for this portal."
    );
  }

  // Enforce global/institute maintenance & lockdown on non-Super-Admin portals
  if (requiredPortal !== "super_admin" && user.role !== "super_admin") {
    const { assertServiceAllowed } = await import("@/services/emergency-policy.service");
    await assertServiceAllowed({
      instituteId: user.instituteId,
      actorRole: user.role,
    });
  }

  return user;
}

/**
 * Step-up authorization check for sensitive operations (e.g., saving payment
 * gateway credentials). Verifies the user is Super Admin AND authenticated
 * within `maxAgeSeconds` (default 15 minutes) via Firebase `auth_time`.
 */
export async function requireRecentSuperAdminAuth(
  maxAgeSeconds = 900
): Promise<SessionUser> {
  const user = await requireSessionUser("super_admin");
  const config = getSessionCookieConfig();
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(config.name)?.value;
  if (!rawCookie) {
    throw new AuthError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const decoded = await verifyFirebaseSessionCookie(rawCookie, true);
  const authTime = typeof decoded.auth_time === "number" ? decoded.auth_time : 0;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (nowSeconds - authTime > maxAgeSeconds) {
    throw new AuthError(
      403,
      "REAUTH_REQUIRED",
      "Recent Super Admin authentication is required for credential changes. Please sign in again."
    );
  }

  return user;
}
