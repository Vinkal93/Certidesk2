import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  createStudyMaterial,
  listInstituteStudyMaterials,
} from "@/services/study-material.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const materialSchema = z.object({
  title: z.string().trim().min(2, "Title is required.").max(140),
  description: z.string().trim().max(500).default(""),
  materialType: z.enum(["document", "link", "channel", "video"]).default("link"),
  url: z.string().trim().url("Enter a valid https:// URL."),
  courseName: z.string().trim().max(120).default("All Courses"),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    const materials = await listInstituteStudyMaterials(actor);
    return jsonOk({ materials });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = materialSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid study material payload."
      );
    }
    const material = await createStudyMaterial(actor, parsed.data);
    return jsonOk({ material }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
