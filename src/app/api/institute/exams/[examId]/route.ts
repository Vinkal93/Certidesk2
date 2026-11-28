import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  declareOnlineExamResults,
  getExamAttemptAnalysis,
  getOnlineExamDetails,
  hideOnlineExamResults,
  reevaluateOnlineExamResults,
  reviseExamResultMarks,
  updateOnlineExam,
} from "@/services/online-exam.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_questions"),
    questionIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    action: z.literal("set_status"),
    status: z.enum([
      "draft",
      "ready_for_review",
      "scheduled",
      "published",
      "in_progress",
      "closed",
      "cancelled",
      "archived",
    ]),
  }),
  z.object({
    action: z.literal("set_schedule"),
    windowStartAt: z.string().min(10),
    windowEndAt: z.string().min(10),
    durationMinutes: z.coerce.number().int().min(5).max(360),
  }),
  z.object({
    action: z.literal("update_exam"),
    title: z.string().trim().min(2).max(160).optional(),
    batchIds: z.array(z.string().min(1)).min(1).optional(),
    instructions: z.string().trim().max(2000).optional(),
    passingMarks: z.coerce.number().min(0).max(2000).optional(),
    maxMarks: z.coerce.number().positive().max(2000).optional(),
    windowStartAt: z.string().min(10).optional(),
    windowEndAt: z.string().min(10).optional(),
    durationMinutes: z.coerce.number().int().min(5).max(360).optional(),
    allowStudentAnswerReview: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("declare_results"),
  }),
  z.object({
    action: z.literal("hide_results"),
  }),
  z.object({
    action: z.literal("reevaluate_results"),
    reason: z.string().trim().min(3).max(300).optional(),
  }),
  z.object({
    action: z.literal("revise_result"),
    resultId: z.string().min(1),
    newMarks: z.coerce.number().min(0),
    reason: z.string().trim().min(5).max(300),
  }),
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { examId } = await context.params;
    const attemptId = request.nextUrl.searchParams.get("attemptId");
    if (attemptId) {
      const analysis = await getExamAttemptAnalysis(actor, examId, attemptId);
      return jsonOk(analysis);
    }
    const details = await getOnlineExamDetails(actor, examId);
    return jsonOk(details);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { examId } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid exam update payload."
      );
    }

    const d = parsed.data;
    if (d.action === "set_questions") {
      const exam = await updateOnlineExam(actor, examId, { questionIds: d.questionIds });
      return jsonOk({ exam });
    }
    if (d.action === "set_status") {
      const exam = await updateOnlineExam(actor, examId, { status: d.status });
      return jsonOk({ exam });
    }
    if (d.action === "set_schedule") {
      const exam = await updateOnlineExam(actor, examId, {
        windowStartAt: d.windowStartAt,
        windowEndAt: d.windowEndAt,
        durationMinutes: d.durationMinutes,
      });
      return jsonOk({ exam });
    }
    if (d.action === "update_exam") {
      const { action: _, ...patch } = d;
      const exam = await updateOnlineExam(actor, examId, patch);
      return jsonOk({ exam });
    }
    if (d.action === "declare_results") {
      const res = await declareOnlineExamResults(actor, examId);
      return jsonOk(res);
    }
    if (d.action === "hide_results") {
      const res = await hideOnlineExamResults(actor, examId);
      return jsonOk(res);
    }
    if (d.action === "reevaluate_results") {
      const res = await reevaluateOnlineExamResults(
        actor,
        examId,
        d.reason ?? "Admin bulk re-evaluation"
      );
      return jsonOk(res);
    }
    const result = await reviseExamResultMarks(actor, d.resultId, {
      newMarks: d.newMarks,
      reason: d.reason,
    });
    return jsonOk({ result });
  } catch (error) {
    return handleApiError(error);
  }
}
