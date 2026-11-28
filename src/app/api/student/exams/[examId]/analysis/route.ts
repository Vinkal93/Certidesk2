import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { getExamAttemptAnalysis } from "@/services/online-exam.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { examId } = await context.params;
    const attemptId = request.nextUrl.searchParams.get("attemptId");
    if (!attemptId) {
      return jsonError(400, "ATTEMPT_REQUIRED", "attemptId query param is required.");
    }
    const data = await getExamAttemptAnalysis(actor, examId, attemptId);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}
