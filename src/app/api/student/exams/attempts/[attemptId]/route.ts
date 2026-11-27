import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { autosaveOrSubmitAttempt } from "@/services/online-exam.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const attemptActionSchema = z.object({
  action: z.enum(["autosave", "submit"]),
  answers: z.record(z.string(), z.array(z.string())).default({}),
  markedForReview: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ attemptId: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { attemptId } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = attemptActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid attempt payload."
      );
    }
    const res = await autosaveOrSubmitAttempt(actor, attemptId, parsed.data);
    return jsonOk(res);
  } catch (error) {
    return handleApiError(error);
  }
}
