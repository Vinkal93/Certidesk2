import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  AuthError,
  clearSessionCookie,
  requireSessionUser,
  SESSION_ID_COOKIE_NAME,
} from "@/lib/security/session";
import { securitySessionsCollection } from "@/lib/firebase/firestore";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await requireSessionUser();
    const { sessionId } = await context.params;
    const cookieStore = await cookies();
    const currentSid = cookieStore.get(SESSION_ID_COOKIE_NAME)?.value ?? null;

    const docRef = securitySessionsCollection().doc(sessionId);
    const snap = await docRef.get();
    const data = snap.data();

    if (!snap.exists || !data || data.userId !== user.uid) {
      throw new AuthError(404, "SESSION_NOT_FOUND", "Device session not found.");
    }

    await docRef.update({
      status: "revoked",
      revokedAt: new Date().toISOString(),
      revokedByUid: user.uid,
      revokeReason: "User revoked device session",
    });

    const revokedCurrent = sessionId === currentSid;
    if (revokedCurrent) {
      await clearSessionCookie();
    }

    return jsonOk({ revoked: true, revokedCurrent });
  } catch (error) {
    return handleApiError(error);
  }
}
