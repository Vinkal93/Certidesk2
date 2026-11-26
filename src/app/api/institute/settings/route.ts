import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  getInstituteSettings,
  updateInstituteSettings,
} from "@/services/institute-ops.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  address: z.string().trim().min(5).max(300),
  studentIdPrefix: z.string().trim().min(2).max(10),
  certificateSignatoryName: z.string().trim().min(2).max(80),
  certificateSignatoryTitle: z.string().trim().min(2).max(80),
  academicYear: z.string().trim().min(4).max(20),
  notifyOnAdmission: z.boolean(),
  notifyOnFeeDue: z.boolean(),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    const data = await getInstituteSettings(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid settings payload."
      );
    }
    const settings = await updateInstituteSettings(actor, parsed.data);
    return jsonOk({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
