import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { toggleStaffAccountStatus } from "@/services/staff.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const staffStatusSchema = z.object({
  disabled: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const actor = await requireSessionUser("institute");
    const { uid } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = staffStatusSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid staff status payload.");
    }
    const staff = await toggleStaffAccountStatus(actor, uid, parsed.data.disabled);
    return jsonOk({ staff });
  } catch (error) {
    return handleApiError(error);
  }
}
