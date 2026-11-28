import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import {
  createGlobalQuestionBankItem,
  listGlobalQuestionBank,
} from "@/services/online-exam.service";
import { questionItemSchema } from "@/lib/validation/question-bank";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "1";
    const questions = await listGlobalQuestionBank(actor, includeDeleted);
    return jsonOk({ questions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = questionItemSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid question payload."
      );
    }
    const question = await createGlobalQuestionBankItem(actor, parsed.data);
    return jsonOk({ question }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
