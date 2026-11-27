import { NextRequest } from "next/server";
import { publicRegisterSchema } from "@/lib/validation/registration";
import { assertServiceAllowed } from "@/services/emergency-policy.service";
import { registerPublicInstitute } from "@/services/registration.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    await assertServiceAllowed({
      serviceId: "admissions",
      operation: "register_institute",
      isWrite: true,
      actorRole: "public",
    });
    const body: unknown = await request.json().catch(() => null);
    const parsed = publicRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid registration details."
      );
    }

    const result = await registerPublicInstitute(parsed.data);
    return jsonOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
