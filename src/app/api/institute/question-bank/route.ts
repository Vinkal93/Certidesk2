import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { createQuestionBankItem, listQuestionBank } from "@/services/online-exam.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const createQuestionSchema = z.object({
  questionText: z.string().trim().min(3).max(2000),
  questionType: z.enum(["single_mcq", "multi_mcq"]).default("single_mcq"),
  subject: z.string().trim().min(1).max(80),
  topic: z.string().trim().max(80).default("General"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().trim().min(1).max(500),
      })
    )
    .min(2)
    .max(6),
  correctOptionIds: z.array(z.string().min(1)).min(1),
  marks: z.coerce.number().positive().max(100),
  negativeMarks: z.coerce.number().min(0).max(50).optional(),
  explanation: z.string().trim().max(1000).optional(),
});

export async function GET() {
  try {
    const actor = await requireSessionUser();
    const questions = await listQuestionBank(actor);
    return jsonOk({ questions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid question payload."
      );
    }
    const question = await createQuestionBankItem(actor, parsed.data);
    return jsonOk({ question }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
