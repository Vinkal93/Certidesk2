import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { markStudentNotificationRead } from "@/services/student-portal.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const markReadSchema = z.object({
  notificationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("student");
    const body: unknown = await request.json().catch(() => null);
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Notification ID is required.");
    }
    await markStudentNotificationRead(actor, parsed.data.notificationId);
    return jsonOk({ read: true });
  } catch (error) {
    return handleApiError(error);
  }
}
