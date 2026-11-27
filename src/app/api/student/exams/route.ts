import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  listStudentAssignedExams,
  startStudentExamAttempt,
} from "@/services/online-exam.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const startSchema = z.object({
  examId: z.string().min(1),
});

export async function GET() {
  try {
    const actor = await requireSessionUser();
    const data = await listStudentAssignedExams(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "examId is required.");
    }
    const attempt = await startStudentExamAttempt(actor, parsed.data.examId);
    return jsonOk({ attempt }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
