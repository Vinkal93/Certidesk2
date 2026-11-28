import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  deleteGlobalQuestionBankItem,
  restoreGlobalQuestionBankItem,
  updateGlobalQuestionBankItem,
} from "@/services/online-exam.service";
import { questionItemSchema } from "@/lib/validation/question-bank";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const patchActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("update"), data: questionItemSchema }),
]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => null);

    if (
      body &&
      typeof body === "object" &&
      "action" in body &&
      (body as { action: string }).action === "restore"
    ) {
      const question = await restoreGlobalQuestionBankItem(actor, id);
      return jsonOk({ question });
    }

    const parsedAction = patchActionSchema.safeParse(body);
    if (parsedAction.success && parsedAction.data.action === "update") {
      const question = await updateGlobalQuestionBankItem(
        actor,
        id,
        parsedAction.data.data
      );
      return jsonOk({ question });
    }

    const parsedDirect = questionItemSchema.safeParse(body);
    if (!parsedDirect.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsedDirect.error.issues[0]?.message ?? "Invalid question update payload."
      );
    }
    const question = await updateGlobalQuestionBankItem(actor, id, parsedDirect.data);
    return jsonOk({ question });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { id } = await context.params;
    const reason = request.nextUrl.searchParams.get("reason") ?? "Deleted by super admin";
    const result = await deleteGlobalQuestionBankItem(actor, id, reason);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
