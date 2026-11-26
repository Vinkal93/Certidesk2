import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { createCourseSchema } from "@/lib/validation/academic";
import { updateCourse } from "@/services/academic.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

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
