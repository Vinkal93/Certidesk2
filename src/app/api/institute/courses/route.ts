import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { createCourseSchema } from "@/lib/validation/academic";
import { createCourse, listCourses } from "@/services/academic.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    const courses = await listCourses(actor);
    return jsonOk({ courses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = createCourseSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid course payload."
      );
    }
    const course = await createCourse(actor, parsed.data);
    return jsonOk({ course }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
