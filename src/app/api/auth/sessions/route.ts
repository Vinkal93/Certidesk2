import { cookies } from "next/headers";
import { requireSessionUser, SESSION_ID_COOKIE_NAME } from "@/lib/security/session";
import { securitySessionsCollection } from "@/lib/firebase/firestore";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

function parseDeviceLabel(ua: string | null | undefined): {
  device: string;
  browser: string;
  isMobile: boolean;
} {
  if (!ua) return { device: "Unknown Device", browser: "Browser", isMobile: false };
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  let device = "Desktop PC";
  if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android/i.test(ua)) device = "Android Device";
  else if (/Windows/i.test(ua)) device = "Windows PC";
  else if (/Macintosh|Mac OS/i.test(ua)) device = "Mac";
  else if (/Linux/i.test(ua)) device = "Linux PC";

  let browser = "Web Browser";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return { device, browser, isMobile };
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    const cookieStore = await cookies();
    const currentSid = cookieStore.get(SESSION_ID_COOKIE_NAME)?.value ?? null;

    const snap = await securitySessionsCollection().where("userId", "==", user.uid).get();

    const now = Date.now();
    const sessions = snap.docs
      .map((d) => d.data())
      .filter((s) => s.status === "active" && Date.parse(s.expiresAt) > now)
      .sort((a, b) =>
        (b.lastVerifiedAt || b.createdAt).localeCompare(a.lastVerifiedAt || a.createdAt)
      )
      .map((s) => {
        const parsed = parseDeviceLabel(s.userAgent);
        return {
          id: s.id,
          device: parsed.device,
          browser: parsed.browser,
          isMobile: parsed.isMobile,
          ipAddress: s.ipAddress ?? "Unknown IP",
          createdAt: s.createdAt,
          lastVerifiedAt: s.lastVerifiedAt || s.createdAt,
          expiresAt: s.expiresAt,
          isCurrent: s.id === currentSid,
        };
      });

    return jsonOk({ sessions, currentSid });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireSessionUser();
    const cookieStore = await cookies();
    const currentSid = cookieStore.get(SESSION_ID_COOKIE_NAME)?.value ?? null;

    const snap = await securitySessionsCollection().where("userId", "==", user.uid).get();

    const nowIso = new Date().toISOString();
    let revokedCount = 0;

    await Promise.all(
      snap.docs
        .filter((d) => d.data().status === "active" && d.id !== currentSid)
        .map(async (d) => {
          revokedCount++;
          await d.ref.update({
            status: "revoked",
            revokedAt: nowIso,
            revokedByUid: user.uid,
            revokeReason: "User signed out all other devices",
          });
        })
    );

    return jsonOk({ revokedCount });
  } catch (error) {
    return handleApiError(error);
  }
}
