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
  presetKey: z
    .enum(["sbci_navy_gold", "classic_academic", "modern_minimal", "custom"])
    .optional(),
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  backgroundColorHex: z.string().default("#FFFFFF"),
  borderColorHex: z.string().default("#D4AF37"),
  accentColorHex: z.string().optional(),
  secondaryColorHex: z.string().optional(),
  showDoubleGoldBorder: z.boolean().optional(),
  showCornerDecorations: z.boolean().optional(),
  showGuillocheBg: z.boolean().optional(),
  watermarkText: z.string().max(60).default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  elements: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum([
        "text",
        "placeholder",
        "qr_code",
        "divider",
        "image",
        "pill",
        "banner",
        "ribbon",
        "medal",
        "seal",
      ]),
      label: z.string(),
      content: z.string(),
      xMm: z.number(),
      yMm: z.number(),
      widthMm: z.number(),
      heightMm: z.number(),
      fontFamily: z.enum([
        "Cinzel Decorative",
        "Cormorant Garamond",
        "Great Vibes",
        "Allura",
        "Montserrat",
        "Libre Baskerville",
        "Helvetica",
        "TimesRoman",
        "Courier",
      ]),
      fontSizePt: z.number().min(5).max(96),
      fontWeight: z.enum(["normal", "bold"]),
      fontStyle: z.enum(["normal", "italic"]).optional(),
      colorHex: z.string(),
      backgroundColorHex: z.string().optional(),
      borderColorHex: z.string().optional(),
      align: z.enum(["left", "center", "right"]),
      zIndex: z.number().optional(),
      locked: z.boolean().optional(),
      visible: z.boolean().optional(),
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
