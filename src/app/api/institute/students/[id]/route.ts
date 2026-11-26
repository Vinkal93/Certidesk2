import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { studentActionSchema, updateStudentSchema } from "@/lib/validation/student";
import {
  getInstituteStudentById,
  resetStudentPassword,
  setStudentStatus,
  updateStudentProfile,
} from "@/services/student.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("institute");
    const { id } = await context.params;
    const student = await getInstituteStudentById(actor, id);
    return jsonOk({ student });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("institute");
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = updateStudentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid student update payload."
      );
    }

    const student = await updateStudentProfile(actor, id, parsed.data);
    return jsonOk({ student });
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
    const body: unknown = await request.json().catch(() => null);
    const parsed = studentActionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid student action.");
    }

    if (parsed.data.action === "activate") {
      const student = await setStudentStatus(actor, id, "active");
      return jsonOk({ student });
    }
    if (parsed.data.action === "disable") {
      const student = await setStudentStatus(actor, id, "disabled");
      return jsonOk({ student });
    }

    const reset = await resetStudentPassword(actor, id);
    return jsonOk({ reset });
  } catch (error) {
    return handleApiError(error);
  }
}
