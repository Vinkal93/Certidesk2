import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { createCourseSchema } from "@/lib/validation/academic";
import { deleteCourse, restoreCourse, updateCourse } from "@/services/academic.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const deleteSchema = z.object({
  reason: z.string().trim().min(2).max(200).default("Deleted by administrator"),
  force: z.boolean().optional().default(false),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("institute");
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = createCourseSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid course update."
      );
    }
    const course = await updateCourse(actor, id, parsed.data);
    return jsonOk({ course });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("institute");
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => ({}));
    const parsed = deleteSchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason : "Deleted by administrator";
    const force = parsed.success ? parsed.data.force : false;

    const result = await deleteCourse(actor, id, reason, force);
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
    const actor = await requireSessionUser("institute");
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { action?: string } | null;
    if (body?.action !== "restore") {
      return jsonError(400, "VALIDATION_ERROR", "Unsupported course action.");
    }
    const course = await restoreCourse(actor, id);
    return jsonOk({ course });
  } catch (error) {
    return handleApiError(error);
  }
}
