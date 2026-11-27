import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  listSecuritySessions,
  revokeSessionById,
  revokeUserSessions,
  updateSecurityPolicyConfig,
} from "@/services/security-center.service";

const sessionActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("revoke_session"),
    sessionId: z.string().min(3),
    reason: z.string().trim().min(3).max(300),
  }),
  z.object({
    action: z.literal("revoke_user"),
    targetUid: z.string().min(3),
    reason: z.string().trim().min(3).max(300),
  }),
  z.object({
    action: z.literal("update_policy"),
    sessionLifetimeDays: z.coerce.number().int().min(1).max(14),
    idleTimeoutMinutes: z.coerce.number().int().min(5).max(1440),
  }),
]);

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { searchParams } = new URL(request.url);
    const sessions = await listSecuritySessions(actor, {
      status: searchParams.get("status") ?? "all",
      role: searchParams.get("role") ?? "all",
      search: searchParams.get("search") ?? undefined,
    });
    return jsonOk({ sessions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body: unknown = await request.json().catch(() => null);

    // Backward compatibility with legacy { targetUid, reason } payload
    if (body && typeof body === "object" && "targetUid" in body && !("action" in body)) {
      const legacy = z
        .object({ targetUid: z.string().min(3), reason: z.string().min(3).max(300) })
        .safeParse(body);
      if (!legacy.success) {
        return jsonError(400, "VALIDATION_ERROR", "Invalid session revocation payload.");
      }
      const result = await revokeUserSessions(actor, legacy.data);
      return jsonOk(result);
    }

    const parsed = sessionActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid session action payload."
      );
    }

    if (parsed.data.action === "revoke_session") {
      const session = await revokeSessionById(actor, {
        sessionId: parsed.data.sessionId,
        reason: parsed.data.reason,
      });
      return jsonOk({ session });
    }
    if (parsed.data.action === "revoke_user") {
      const result = await revokeUserSessions(actor, {
        targetUid: parsed.data.targetUid,
        reason: parsed.data.reason,
      });
      return jsonOk(result);
    }

    const policy = await updateSecurityPolicyConfig(actor, {
      sessionLifetimeDays: parsed.data.sessionLifetimeDays,
      idleTimeoutMinutes: parsed.data.idleTimeoutMinutes,
    });
    return jsonOk({ policy });
  } catch (error) {
    return handleApiError(error);
  }
}
