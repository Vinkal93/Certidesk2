/**
 * Diagnostic endpoint — safe to expose publicly.
 * Returns env var presence (never values) and Firebase Admin init status.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    nodeEnv: process.env.NODE_ENV,
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyStartsWith: process.env.FIREBASE_PRIVATE_KEY?.slice(0, 27) ?? "MISSING",
    hasSessionCookieName: !!process.env.SESSION_COOKIE_NAME,
    hasAppBaseUrl: !!process.env.APP_BASE_URL,
    hasNextPublicSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL ?? "not-set",
    hasSupAdminEmails: !!process.env.SUPER_ADMIN_EMAILS,
  };

  // Try to initialise Firebase Admin safely
  let adminStatus = "not-tested";
  try {
    const { getAdminApp } = await import("@/lib/firebase/admin");
    getAdminApp();
    adminStatus = "ok";
  } catch (err: unknown) {
    adminStatus = err instanceof Error ? err.message : String(err);
  }

  // Try getServerEnv safely
  let envStatus = "not-tested";
  try {
    const { getServerEnv } = await import("@/config/env.server");
    getServerEnv();
    envStatus = "ok";
  } catch (err: unknown) {
    envStatus = err instanceof Error ? err.message : String(err);
  }

  return Response.json({
    ok: adminStatus === "ok" && envStatus === "ok",
    ts: new Date().toISOString(),
    checks,
    adminInit: adminStatus,
    envParse: envStatus,
  });
}
