import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  createGlobalCertificateTemplate,
  listGlobalCertificateTemplates,
} from "@/services/su-platform.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const templateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  layoutStyle: z.enum(["classic", "modern", "merit"]),
  numberingPrefix: z.string().trim().min(2).max(12).default("CERT"),
  version: z.coerce.number().int().min(1).default(1),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const templates = await listGlobalCertificateTemplates(actor);
    return jsonOk({ templates });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid certificate template."
      );
    }
    const template = await createGlobalCertificateTemplate(actor, parsed.data);
    return jsonOk({ template }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
