import { cookies } from "next/headers";
import { requireSessionUser, SESSION_ID_COOKIE_NAME } from "@/lib/security/session";
import { securitySessionsCollection } from "@/lib/firebase/firestore";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

function parseDeviceLabel(ua: string | null | undefined): {
  device: string;
  os: string;
  browser: string;
  isMobile: boolean;
} {
  if (!ua) {
    return {
      device: "Unknown Device",
      os: "Unknown OS",
      browser: "Browser",
      isMobile: false,
    };
  }
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  let device = "Desktop PC";
  let os = "Unknown OS";

  if (/iPhone/i.test(ua)) {
    device = "iPhone";
    os = "iOS";
  } else if (/iPad/i.test(ua)) {
    device = "iPad";
    os = "iPadOS";
  } else if (/Android/i.test(ua)) {
    device = "Android Device";
    os = "Android";
  } else if (/Windows/i.test(ua)) {
    device = "Windows PC";
    os = "Windows";
  } else if (/Macintosh|Mac OS/i.test(ua)) {
    device = "Mac";
    os = "macOS";
  } else if (/Linux/i.test(ua)) {
    device = "Linux PC";
    os = "Linux";
  }

  let browser = "Web Browser";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return { device, os, browser, isMobile };
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    const cookieStore = await cookies();
    const currentSid = cookieStore.get(SESSION_ID_COOKIE_NAME)?.value ?? null;

    const snap = await securitySessionsCollection().where("userId", "==", user.uid).get();

    const now = Date.now();
    const allDocs = snap.docs
      .map((d) => d.data())
      .sort((a, b) =>
        (b.lastVerifiedAt || b.createdAt).localeCompare(a.lastVerifiedAt || a.createdAt)
      )
      .map((s) => {
        const parsed = parseDeviceLabel(s.userAgent);
        const isExpired = s.status === "expired" || Date.parse(s.expiresAt) <= now;
        const effectiveStatus =
          s.status === "revoked" ? "revoked" : isExpired ? "expired" : "active";
        return {
          id: s.id,
          device: parsed.device,
          os: parsed.os,
          browser: parsed.browser,
          isMobile: parsed.isMobile,
          ipAddress: s.ipAddress ?? "Unknown IP",
          createdAt: s.createdAt,
          lastVerifiedAt: s.lastVerifiedAt || s.createdAt,
          expiresAt: s.expiresAt,
          status: effectiveStatus,
          revokedAt: s.revokedAt ?? null,
          revokeReason: s.revokeReason ?? null,
          isCurrent: s.id === currentSid,
        };
      });

    const sessions = allDocs.filter((s) => s.status === "active");
    const history = allDocs.slice(0, 20);

    return jsonOk({ sessions, history, currentSid, syncedAt: new Date().toISOString() });
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
