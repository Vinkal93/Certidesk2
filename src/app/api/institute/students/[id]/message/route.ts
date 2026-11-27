import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { sendInstitutePopupMessage } from "@/services/popup-messages.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const sendStudentMessageSchema = z.object({
  category: z
    .enum(["announcement", "fee_reminder", "exam_notice", "billing_alert", "urgent"])
    .default("announcement"),
  title: z.string().trim().min(2, "Title is required.").max(120),
  message: z.string().trim().min(2, "Message is required.").max(1000),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("institute");
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = sendStudentMessageSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid message payload."
      );
    }

    const record = await sendInstitutePopupMessage(actor, {
      targetType: "student",
      studentId: id,
      category: parsed.data.category,
      title: parsed.data.title,
      message: parsed.data.message,
    });

    return jsonOk({ sent: true, record }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
