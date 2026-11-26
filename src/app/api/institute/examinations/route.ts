import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  createExamination,
  listExaminations,
  publishExamResults,
  saveStudentExamMarks,
} from "@/services/exam.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const examActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_exam"),
    title: z.string().trim().min(2).max(120),
    batchId: z.string().min(1),
    batchName: z.string().min(1),
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    subjects: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().trim().min(1),
          maxMarks: z.coerce.number().int().min(1).max(1000),
          passingMarks: z.coerce.number().int().min(0).max(1000),
        })
      )
      .min(1),
  }),
  z.object({
    action: z.literal("enter_marks"),
    examId: z.string().min(1),
    studentId: z.string().min(1),
    marks: z.array(
      z.object({
        subjectId: z.string().min(1),
        obtainedMarks: z.coerce.number().min(0),
      })
    ),
  }),
  z.object({
    action: z.literal("publish_exam"),
    examId: z.string().min(1),
  }),
]);

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    const data = await listExaminations(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = examActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid examination payload."
      );
    }

    if (parsed.data.action === "create_exam") {
      const exam = await createExamination(actor, parsed.data);
      return jsonOk({ exam }, 201);
    }
    if (parsed.data.action === "enter_marks") {
      const marksheet = await saveStudentExamMarks(actor, parsed.data);
      return jsonOk({ marksheet }, 201);
    }

    const exam = await publishExamResults(actor, parsed.data.examId);
    return jsonOk({ exam });
  } catch (error) {
    return handleApiError(error);
  }
}
