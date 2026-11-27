import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  listMarksheetTemplates,
  saveMarksheetTemplate,
} from "@/services/template-studio.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const saveSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  headerTitle: z.string().trim().min(2).max(160),
  footerNote: z.string().trim().max(300).default(""),
  watermarkText: z.string().trim().max(60).default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  columns: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        widthPercent: z.number().min(5).max(80),
        align: z.enum(["left", "center", "right"]),
      })
    )
    .min(2),
});

export async function GET() {
  try {
    await requireSessionUser("super_admin");
    const templates = await listMarksheetTemplates();
    return jsonOk({ templates });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid marksheet template payload."
      );
    }
    const { id, ...rest } = parsed.data;
    const saved = await saveMarksheetTemplate(actor, {
      ...(id ? { id } : {}),
      ...rest,
    });
    return jsonOk({ template: saved }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
