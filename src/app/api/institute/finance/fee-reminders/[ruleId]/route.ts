import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";
import {
  deleteFeeReminderRule,
  updateFeeReminderRule,
} from "@/services/fee-reminder.service";

const patchRuleSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  allowDismiss: z.boolean().optional(),
  allowRemindLater: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ ruleId: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { ruleId } = await context.params;
    const body: unknown = await req.json().catch(() => null);
    const parsed = patchRuleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid rule update payload.");
    }
    const rule = await updateFeeReminderRule(actor, ruleId, parsed.data);
    return jsonOk({ rule });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ ruleId: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { ruleId } = await context.params;
    const res = await deleteFeeReminderRule(actor, ruleId);
    return jsonOk(res);
  } catch (error) {
    return handleApiError(error);
  }
}
