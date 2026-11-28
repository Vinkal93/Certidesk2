import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { bulkImportQuestionBankItems } from "@/services/online-exam.service";
import { questionItemSchema } from "@/lib/validation/question-bank";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const importPayloadSchema = z.object({
  questions: z.array(questionItemSchema).min(1).max(2500),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = importPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid bulk import payload."
      );
    }
    const result = await bulkImportQuestionBankItems(actor, parsed.data.questions);
    return jsonOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
