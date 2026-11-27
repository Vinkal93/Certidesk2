import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { onboardingActionSchema } from "@/lib/validation/registration";
import { updateInstituteOnboardingStatus } from "@/services/registration.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = onboardingActionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid onboarding action.");
    }

    const result = await updateInstituteOnboardingStatus(actor, parsed.data.action);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
