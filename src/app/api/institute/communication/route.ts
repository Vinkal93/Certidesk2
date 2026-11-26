import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  dispatchInstituteNotification,
  listCommunicationLogs,
} from "@/services/institute-ops.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const sendSchema = z.object({
  channel: z.enum(["whatsapp", "sms", "in_app"]),
  category: z.enum([
    "fee_reminder",
    "admission",
    "examination",
    "certificate",
    "general",
  ]),
  recipientCount: z.coerce.number().int().min(1).max(10000),
  message: z.string().trim().min(5).max(500),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    const logs = await listCommunicationLogs(actor);
    return jsonOk({ logs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid notification payload."
      );
    }
    const log = await dispatchInstituteNotification(actor, parsed.data);
    return jsonOk({ log }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
