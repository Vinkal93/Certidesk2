import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  getAccessControlOverview,
  upsertUserPermissionOverride,
} from "@/services/security-center.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const overrideSchema = z.object({
  targetUid: z.string().min(3),
  grantedPermissions: z.array(z.string().min(2)).max(50),
  revokedPermissions: z.array(z.string().min(2)).max(50),
  reason: z.string().trim().min(3).max(300),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await getAccessControlOverview(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body: unknown = await request.json().catch(() => null);
    const parsed = overrideSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid permission override payload."
      );
    }
    const override = await upsertUserPermissionOverride(actor, parsed.data);
    return jsonOk({ override });
  } catch (error) {
    return handleApiError(error);
  }
}
