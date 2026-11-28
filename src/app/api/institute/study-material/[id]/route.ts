import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  deleteStudyMaterial,
  updateStudyMaterial,
} from "@/services/study-material.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const updateSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(500).default(""),
  materialType: z.enum(["document", "link", "channel", "video"]).default("link"),
  url: z.string().trim().url("Enter a valid https:// URL."),
  courseName: z.string().trim().max(120).default("All Courses"),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("institute");
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid study material payload."
      );
    }
    const material = await updateStudyMaterial(actor, id, parsed.data);
    return jsonOk({ material });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("institute");
    const { id } = await context.params;
    const result = await deleteStudyMaterial(actor, id);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
