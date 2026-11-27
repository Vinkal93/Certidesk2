import "server-only";
import {
  getAdminUserByUid,
  revokeUserRefreshTokens,
  setUserCustomClaims,
  verifyFirebaseIdToken,
} from "@/lib/firebase/auth";
import {
  institutesCollection,
  loginMappingsCollection,
  studentsCollection,
  usersCollection,
} from "@/lib/firebase/firestore";
import {
  extractSessionUserFromClaims,
  isRoleAllowedInPortal,
} from "@/lib/security/permissions";
import {
  AuthError,
  clearSessionCookie,
  createAndSetSessionCookie,
  isAllowlistedSuperAdminEmail,
} from "@/lib/security/session";
import { recordAuditLog } from "./audit.service";
import { recordLoginEvent } from "./security-events.service";
import type { PortalType, SessionUser } from "@/types/auth";

export function normalizePhoneE164(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "").trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("+") && /^\+[1-9]\d{9,14}$/.test(cleaned)) {
    return cleaned;
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  return null;
}

export async function resolvePortalLoginIdentifier(
  portal: "institute" | "student",
  identifier: string
): Promise<{ authEmail: string }> {
  const trimmed = identifier.trim();
  const normalizedUpper = trimmed.toUpperCase();
  const mappingId = `${portal}_${normalizedUpper}`;
  const mappingSnap = await loginMappingsCollection().doc(mappingId).get();
  let mapping = mappingSnap.data();

  // Multi-identifier resolution for Institute Admin (Institute ID / Code, Email, or Mobile E.164)
  if ((!mappingSnap.exists || !mapping) && portal === "institute") {
    let resolvedUser:
      | {
          uid: string;
          email: string;
          role: string;
          instituteId: string | null;
          disabled?: boolean;
        }
      | undefined;

    if (trimmed.includes("@")) {
      const emailLower = trimmed.toLowerCase();
      const userSnap = await usersCollection()
        .where("email", "==", emailLower)
        .limit(2)
        .get();
      if (userSnap.size === 1) {
        const u = userSnap.docs[0]?.data();
        if (u && (u.role === "institute_admin" || u.role === "staff")) {
          resolvedUser = u;
        }
      }
    } else if (/^INST_[A-Z0-9_-]+$/.test(normalizedUpper)) {
      const instDoc = await institutesCollection().doc(normalizedUpper).get();
      const inst = instDoc.data();
      if (inst?.adminUid) {
        const ownerSnap = await usersCollection().doc(inst.adminUid).get();
        const u = ownerSnap.data();
        if (u && (u.role === "institute_admin" || u.role === "staff")) {
          resolvedUser = u;
        }
      }
    } else {
      const e164 = normalizePhoneE164(trimmed);
      if (e164) {
        const instSnap = await institutesCollection()
          .where("phone", "==", e164)
          .limit(2)
          .get();
        if (instSnap.size === 1) {
          const inst = instSnap.docs[0]?.data();
          if (inst?.adminUid) {
            const ownerSnap = await usersCollection().doc(inst.adminUid).get();
            const u = ownerSnap.data();
            if (u && (u.role === "institute_admin" || u.role === "staff")) {
              resolvedUser = u;
            }
          }
        }
      }
    }

    if (resolvedUser && resolvedUser.instituteId) {
      if (resolvedUser.disabled) {
        throw new AuthError(
          403,
          "ACCOUNT_DISABLED",
          "This account is currently disabled."
        );
      }
      mapping = {
        portal: "institute",
        identifier: normalizedUpper,
        uid: resolvedUser.uid,
        authEmail: resolvedUser.email,
        instituteId: resolvedUser.instituteId,
        active: !resolvedUser.disabled,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if (!mapping) {
    throw new AuthError(401, "INVALID_CREDENTIALS", "Invalid credentials.");
  }

  if (!mapping.active) {
    throw new AuthError(403, "ACCOUNT_DISABLED", "This account is currently disabled.");
  }

  const instituteSnap = await institutesCollection().doc(mapping.instituteId).get();
  const institute = instituteSnap.data();
  if (!instituteSnap.exists || !institute) {
    throw new AuthError(401, "INVALID_CREDENTIALS", "Invalid credentials.");
  }

  if (institute.status !== "active") {
    throw new AuthError(
      423,
      "INSTITUTE_SUSPENDED",
      "This institute is currently suspended. Contact platform support."
    );
  }

  return { authEmail: mapping.authEmail };
}

export function verifySuperAdminSecretCode(secretCode?: string): void {
  const expected = process.env.SUPER_ADMIN_SECRET_CODE?.trim() || "GLTPP2290D";
  if ((secretCode ?? "").trim() !== expected) {
    throw new AuthError(
      403,
      "INVALID_SECRET_CODE",
      "Invalid Super Admin Secret Key. Access denied."
    );
  }
}

export async function establishPortalSession(
  idToken: string,
  portal: PortalType,
  requestMeta?: {
    ipAddress?: string | null;
    userAgent?: string | null;
    secretCode?: string | undefined;
    enforceSuperAdminSecret?: boolean | undefined;
  }
): Promise<SessionUser> {
  const decoded = await verifyFirebaseIdToken(idToken, true).catch(async () => {
    await recordLoginEvent({
      identifier: `unknown:${portal}`,
      role: "unknown",
      authMethod: "id_token",
      result: "failed",
      failureCategory: "invalid_token",
      ipAddress: requestMeta?.ipAddress ?? null,
      userAgent: requestMeta?.userAgent ?? null,
    }).catch(() => undefined);
    throw new AuthError(401, "INVALID_TOKEN", "Invalid or expired authentication token.");
  });

  if (
    portal === "super_admin" &&
    requestMeta?.enforceSuperAdminSecret &&
    !decoded.qrSessionId
  ) {
    try {
      verifySuperAdminSecretCode(requestMeta.secretCode);
    } catch (err) {
      await recordLoginEvent({
        userId: decoded.uid,
        identifier: decoded.email ?? decoded.uid,
        role: "super_admin",
        authMethod: "id_token",
        result: "failed",
        failureCategory: "invalid_secret_code",
        ipAddress: requestMeta?.ipAddress ?? null,
        userAgent: requestMeta?.userAgent ?? null,
      }).catch(() => undefined);
      throw err;
    }
  }

  let sessionUser = extractSessionUserFromClaims({
    uid: decoded.uid,
    email: decoded.email,
    role: decoded.role,
    instituteId: decoded.instituteId,
    studentId: decoded.studentId,
    permissions: decoded.permissions,
    mustChangePassword: decoded.mustChangePassword,
  });

  if (
    !sessionUser &&
    portal === "super_admin" &&
    !decoded.role &&
    isAllowlistedSuperAdminEmail(decoded.email)
  ) {
    const authUser = await getAdminUserByUid(decoded.uid);
    if (authUser.disabled) {
      await revokeUserRefreshTokens(decoded.uid).catch(() => undefined);
      throw new AuthError(403, "ACCOUNT_DISABLED", "This account has been disabled.");
    }

    const existingUserSnap = await usersCollection().doc(decoded.uid).get();
    const existingUser = existingUserSnap.data();
    if (existingUser && (existingUser.disabled || existingUser.role !== "super_admin")) {
      throw new AuthError(
        403,
        "WRONG_PORTAL",
        "This account cannot be provisioned as Super Admin."
      );
    }

    await setUserCustomClaims(decoded.uid, {
      role: "super_admin",
      instituteId: null,
      studentId: null,
      permissions: [],
      mustChangePassword: false,
    });

    const now = new Date().toISOString();
    await usersCollection()
      .doc(decoded.uid)
      .set(
        {
          uid: decoded.uid,
          email: decoded.email ?? "",
          displayName: authUser.displayName ?? "Platform Super Admin",
          role: "super_admin",
          instituteId: null,
          studentId: null,
          permissions: [],
          disabled: false,
          mustChangePassword: false,
          createdAt: existingUser?.createdAt ?? now,
          updatedAt: now,
        },
        { merge: true }
      );

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
    await recordAuditLog({
      action: "AUTH_LOGIN_REJECTED",
      actorUid: decoded.uid,
      actorRole: "system",
      metadata: { portal, reason: "missing_or_invalid_role_claim" },
    });
    throw new AuthError(
      403,
      "ROLE_NOT_PROVISIONED",
      "Account is not provisioned with a valid role."
    );
  }

  if (!isRoleAllowedInPortal(sessionUser.role, portal)) {
    await recordLoginEvent({
      userId: sessionUser.uid,
      identifier: sessionUser.email ?? sessionUser.uid,
      role: sessionUser.role,
      instituteId: sessionUser.instituteId,
      authMethod: "id_token",
      result: "blocked",
      failureCategory: "wrong_portal",
      ipAddress: requestMeta?.ipAddress ?? null,
      userAgent: requestMeta?.userAgent ?? null,
    }).catch(() => undefined);
    await recordAuditLog({
      action: "AUTH_LOGIN_REJECTED",
      actorUid: sessionUser.uid,
      actorRole: sessionUser.role,
      instituteId: sessionUser.instituteId,
      metadata: { portal, reason: "wrong_portal" },
    });
    throw new AuthError(
      403,
      "WRONG_PORTAL",
      "This account cannot sign in through this portal."
    );
  }

  const authUser = await getAdminUserByUid(sessionUser.uid);
  if (authUser.disabled) {
    await revokeUserRefreshTokens(sessionUser.uid).catch(() => undefined);
    await recordLoginEvent({
      userId: sessionUser.uid,
      identifier: sessionUser.email ?? sessionUser.uid,
      role: sessionUser.role,
      instituteId: sessionUser.instituteId,
      authMethod: "id_token",
      result: "blocked",
      failureCategory: "account_disabled",
      ipAddress: requestMeta?.ipAddress ?? null,
      userAgent: requestMeta?.userAgent ?? null,
    }).catch(() => undefined);
    throw new AuthError(403, "ACCOUNT_DISABLED", "This account has been disabled.");
  }

  const userDoc = await usersCollection().doc(sessionUser.uid).get();
  if (userDoc.exists && userDoc.data()?.disabled) {
    await revokeUserRefreshTokens(sessionUser.uid).catch(() => undefined);
    throw new AuthError(403, "ACCOUNT_DISABLED", "This account has been disabled.");
  }

  if (sessionUser.role !== "super_admin") {
    if (!sessionUser.instituteId) {
      throw new AuthError(
        403,
        "INSTITUTE_UNASSIGNED",
        "Account is not linked to any institute."
      );
    }

    const instituteDoc = await institutesCollection().doc(sessionUser.instituteId).get();
    const institute = instituteDoc.data();
    if (!instituteDoc.exists || !institute) {
      throw new AuthError(403, "INSTITUTE_NOT_FOUND", "Institute record not found.");
    }

    if (institute.status !== "active") {
      await revokeUserRefreshTokens(sessionUser.uid).catch(() => undefined);
      await recordAuditLog({
        action: "AUTH_LOGIN_REJECTED",
        actorUid: sessionUser.uid,
        actorRole: sessionUser.role,
        instituteId: sessionUser.instituteId,
        metadata: { portal, reason: "institute_suspended" },
      });
      throw new AuthError(
        423,
        "INSTITUTE_SUSPENDED",
        "This institute is currently suspended."
      );
    }
  }

  if (sessionUser.role === "student") {
    if (!sessionUser.studentId || !sessionUser.instituteId) {
      throw new AuthError(403, "STUDENT_UNASSIGNED", "Student profile link missing.");
    }

    const studentDoc = await studentsCollection().doc(sessionUser.studentId).get();
    const student = studentDoc.data();
    if (
      !studentDoc.exists ||
      !student ||
      student.instituteId !== sessionUser.instituteId
    ) {
      throw new AuthError(403, "STUDENT_NOT_FOUND", "Student profile not found.");
    }

    if (student.status !== "active") {
      await revokeUserRefreshTokens(sessionUser.uid).catch(() => undefined);
      throw new AuthError(
        403,
        "STUDENT_DISABLED",
        "This student account is currently disabled."
      );
    }
  }

  const sessionId = await createAndSetSessionCookie(idToken, {
    userId: sessionUser.uid,
    email: sessionUser.email,
    role: sessionUser.role,
    instituteId: sessionUser.instituteId,
    ipAddress: requestMeta?.ipAddress ?? null,
    userAgent: requestMeta?.userAgent ?? null,
  });

  const mfaEnrolled = (authUser.multiFactor?.enrolledFactors?.length ?? 0) > 0;
  await recordLoginEvent({
    userId: sessionUser.uid,
    identifier: sessionUser.email ?? sessionUser.uid,
    role: sessionUser.role,
    instituteId: sessionUser.instituteId,
    authMethod: "id_token",
    result: "success",
    ipAddress: requestMeta?.ipAddress ?? null,
    userAgent: requestMeta?.userAgent ?? null,
    sessionId,
    mfaEnrolled,
  }).catch(() => undefined);

  await recordAuditLog({
    action: "AUTH_LOGIN_SUCCESS",
    actorUid: sessionUser.uid,
    actorRole: sessionUser.role,
    instituteId: sessionUser.instituteId,
    targetId: sessionUser.studentId ?? sessionUser.instituteId,
    metadata: { portal, sessionId },
  });

  return sessionUser;
}

export async function terminatePortalSession(user: SessionUser | null): Promise<void> {
  await clearSessionCookie();
  if (user) {
    await recordAuditLog({
      action: "AUTH_LOGOUT",
      actorUid: user.uid,
      actorRole: user.role,
      instituteId: user.instituteId,
    });
  }
}
