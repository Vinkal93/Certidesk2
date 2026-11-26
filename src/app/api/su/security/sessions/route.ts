import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  getSecurityCenterOverview,
  revokeUserSessions,
} from "@/services/security-center.service";

const RevokeSchema = z.object({
  targetUid: z.string().min(3),
  reason: z.string().min(3).max(300),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const overview = await getSecurityCenterOverview(actor);
    return jsonOk(overview);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = RevokeSchema.parse(await request.json());
    const result = await revokeUserSessions(actor, body);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
