import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { createOnlineExam, listOnlineExams } from "@/services/online-exam.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const createExamSchema = z.object({
  title: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(30),
  description: z.string().trim().max(600).optional(),
  courseId: z.string().min(1),
  courseName: z.string().min(1),
  batchIds: z.array(z.string().min(1)).min(1),
  instructions: z.string().trim().max(2000).optional(),
  maxMarks: z.coerce.number().positive().max(1000),
  passingMarks: z.coerce.number().min(0).max(1000),
  durationMinutes: z.coerce.number().int().min(5).max(360),
  windowStartAt: z.string().min(10),
  windowEndAt: z.string().min(10),
  allowedAttempts: z.coerce.number().int().min(1).max(10).optional(),
  questionIds: z.array(z.string()).optional(),
  randomizeQuestions: z.boolean().optional(),
  randomizeOptions: z.boolean().optional(),
  negativeMarkingEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const actor = await requireSessionUser();
    const exams = await listOnlineExams(actor);
    return jsonOk({ exams });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = createExamSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid online exam payload."
      );
    }
    const exam = await createOnlineExam(actor, parsed.data);
    return jsonOk({ exam }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
