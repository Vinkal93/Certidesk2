import "server-only";
import type { DecodedIdToken, UserRecord } from "firebase-admin/auth";
import { getAdminAuth } from "./admin";
import type { CustomUserClaims } from "@/types/auth";

export async function verifyFirebaseIdToken(
  idToken: string,
  checkRevoked = true
): Promise<DecodedIdToken> {
  return getAdminAuth().verifyIdToken(idToken, checkRevoked);
}

export async function createFirebaseSessionCookie(
  idToken: string,
  expiresInMs: number
): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, { expiresIn: expiresInMs });
}

export async function verifyFirebaseSessionCookie(
  sessionCookie: string,
  checkRevoked = true
): Promise<DecodedIdToken> {
  return getAdminAuth().verifySessionCookie(sessionCookie, checkRevoked);
}

export async function revokeUserRefreshTokens(uid: string): Promise<void> {
  await getAdminAuth().revokeRefreshTokens(uid);
}

export async function setUserCustomClaims(
  uid: string,
  claims: CustomUserClaims
): Promise<void> {
  await getAdminAuth().setCustomUserClaims(uid, claims);
}

export async function getAdminUserByUid(uid: string): Promise<UserRecord> {
  return getAdminAuth().getUser(uid);
}
