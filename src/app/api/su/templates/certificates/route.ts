import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  listCertificateTemplates,
  saveCertificateTemplate,
} from "@/services/template-studio.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const saveSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  backgroundColorHex: z.string().default("#FFFFFF"),
  borderColorHex: z.string().default("#1D4ED8"),
  watermarkText: z.string().max(60).default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  elements: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum(["text", "placeholder", "qr_code", "divider"]),
      label: z.string(),
      content: z.string(),
      xMm: z.number(),
      yMm: z.number(),
      widthMm: z.number(),
      heightMm: z.number(),
      fontFamily: z.enum(["Helvetica", "TimesRoman", "Courier"]),
      fontSizePt: z.number().min(6).max(72),
      fontWeight: z.enum(["normal", "bold"]),
      colorHex: z.string(),
      align: z.enum(["left", "center", "right"]),
      locked: z.boolean().optional(),
    })
  ),
});

export async function GET() {
  try {
    await requireSessionUser("super_admin");
    const templates = await listCertificateTemplates();
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
        parsed.error.issues[0]?.message ?? "Invalid certificate template payload."
      );
    }
    const { id, ...rest } = parsed.data;
    const saved = await saveCertificateTemplate(actor, {
      ...(id ? { id } : {}),
      ...rest,
      widthMm: rest.orientation === "landscape" ? 297 : 210,
      heightMm: rest.orientation === "landscape" ? 210 : 297,
      elements: rest.elements.map((el) => ({
        ...el,
        locked: el.locked ?? false,
      })),
    });
    return jsonOk({ template: saved }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
