import { NextRequest } from "next/server";
import { z } from "zod";
import { institutesCollection } from "@/lib/firebase/firestore";
import { IMPRESSION_COOKIE_NAME } from "@/lib/security/impression";
import { AuthError, requireSessionUser } from "@/lib/security/session";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { recordAuditLog } from "@/services/audit.service";
import { cookies } from "next/headers";

const StartImpressionSchema = z.object({
  instituteId: z.string().min(2),
  redirectTo: z.string().startsWith("/institute").optional(),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body = StartImpressionSchema.parse(await req.json());

    const instDoc = await institutesCollection().doc(body.instituteId).get();
    if (!instDoc.exists) {
      throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
    }

    const cookieStore = await cookies();
    cookieStore.set(IMPRESSION_COOKIE_NAME, body.instituteId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours
    });

    await recordAuditLog({
      action: "INSTITUTE_UPDATED",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId: body.instituteId,
      targetId: body.instituteId,
      metadata: {
        event: "LIVE_PORTAL_IMPRESSION_STARTED",
        instituteCode: instDoc.data()!.code,
      },
    });

    return jsonOk({
      instituteId: body.instituteId,
      redirectUrl: body.redirectTo ?? "/institute/dashboard",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const currentId = cookieStore.get(IMPRESSION_COOKIE_NAME)?.value;
    cookieStore.set(IMPRESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return jsonOk({
      redirectUrl: currentId ? `/su/institutes/${currentId}` : "/su/institutes",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
