import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireSessionUser } from "@/lib/security/session";
import {
  getUserLoginHistory,
  performUserControlAction,
} from "@/services/su-users.service";

const UserActionSchema = z.object({
  action: z.enum(["block", "unblock", "force_logout", "delete"]),
  reason: z.string().max(240).optional(),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { uid } = await context.params;
    const data = await getUserLoginHistory(actor, uid);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { uid } = await context.params;
    const body = UserActionSchema.parse(await req.json());
    const result = await performUserControlAction(actor, {
      uid,
      action: body.action,
      ...(body.reason !== undefined ? { reason: body.reason } : {}),
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
