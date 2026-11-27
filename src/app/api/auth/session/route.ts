import { NextRequest } from "next/server";
import { createSessionSchema } from "@/lib/validation/auth";
import { getSessionUser } from "@/lib/security/session";
import { establishPortalSession } from "@/services/auth.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "No active session.");
    }
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid session payload."
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    const user = await establishPortalSession(parsed.data.idToken, parsed.data.portal, {
      ipAddress,
      userAgent,
      secretCode: parsed.data.secretCode,
      enforceSuperAdminSecret: parsed.data.portal === "super_admin",
    });
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
