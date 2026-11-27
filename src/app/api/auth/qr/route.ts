import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireSessionUser } from "@/lib/security/session";
import {
  createQrLoginSession,
  pollQrLoginSession,
  scanOrConfirmQrSession,
} from "@/services/qr-login.service";

const QrPostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create") }),
  z.object({
    action: z.enum(["scan", "confirm"]),
    codeId: z.string().min(4),
    token: z.string().min(10),
    deviceName: z.string().max(80).optional(),
  }),
]);

export async function GET(req: NextRequest) {
  try {
    const codeId = req.nextUrl.searchParams.get("codeId")?.trim();
    if (!codeId) {
      return jsonOk({ status: "expired" });
    }
    const result = await pollQrLoginSession(codeId);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = QrPostSchema.parse(raw);

    if (parsed.action === "create") {
      const origin = req.nextUrl.origin;
      const session = await createQrLoginSession(origin);
      return jsonOk(session);
    }

    const actor = await requireSessionUser();
    const result = await scanOrConfirmQrSession(actor, {
      action: parsed.action,
      codeId: parsed.codeId,
      token: parsed.token,
      deviceName: parsed.deviceName,
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
