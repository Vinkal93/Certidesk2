import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import {
  deleteQuestionBankItem,
  restoreQuestionBankItem,
  updateQuestionBankItem,
} from "@/services/online-exam.service";
import { questionItemSchema } from "@/lib/validation/question-bank";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = questionItemSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid question update payload."
      );
    }
    const question = await updateQuestionBankItem(actor, id, parsed.data);
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
    const actor = await requireSessionUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { reason?: string } | null;
    const result = await deleteQuestionBankItem(
      actor,
      id,
      body?.reason || "Deleted by administrator"
    );
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { action?: string } | null;
    if (body?.action !== "restore") {
      return jsonError(400, "VALIDATION_ERROR", "Unsupported question action.");
    }
    const question = await restoreQuestionBankItem(actor, id);
    return jsonOk({ question });
  } catch (error) {
    return handleApiError(error);
  }
}
