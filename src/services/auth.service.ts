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
  createAndSetSessionCookie,
  isAllowlistedSuperAdminEmail,
  revokeSessionAndClearCookie,
} from "@/lib/security/session";
import { recordAuditLog } from "./audit.service";
import type { PortalType, SessionUser } from "@/types/auth";

export async function resolvePortalLoginIdentifier(
  portal: "institute" | "student",
  identifier: string
): Promise<{ authEmail: string }> {
  const normalized = identifier.trim().toUpperCase();
  const mappingId = `${portal}_${normalized}`;
  const mappingSnap = await loginMappingsCollection().doc(mappingId).get();
  const mapping = mappingSnap.data();

  if (!mappingSnap.exists || !mapping) {
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

export async function establishPortalSession(
  idToken: string,
  portal: PortalType
): Promise<SessionUser> {
  const decoded = await verifyFirebaseIdToken(idToken, true).catch(() => {
    throw new AuthError(401, "INVALID_TOKEN", "Invalid or expired authentication token.");
  });

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

  await createAndSetSessionCookie(idToken);

  await recordAuditLog({
    action: "AUTH_LOGIN_SUCCESS",
    actorUid: sessionUser.uid,
    actorRole: sessionUser.role,
    instituteId: sessionUser.instituteId,
    targetId: sessionUser.studentId ?? sessionUser.instituteId,
    metadata: { portal },
  });

  return sessionUser;
}

export async function terminatePortalSession(user: SessionUser | null): Promise<void> {
  await revokeSessionAndClearCookie(user?.uid);
  if (user) {
    await recordAuditLog({
      action: "AUTH_LOGOUT",
      actorUid: user.uid,
      actorRole: user.role,
      instituteId: user.instituteId,
    });
  }
}
