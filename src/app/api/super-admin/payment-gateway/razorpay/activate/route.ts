import { NextRequest } from "next/server";
import { requireRecentSuperAdminAuth } from "@/lib/security/session";
import { activateGatewaySchema } from "@/lib/validation/gateway";
import { activateOrDisableRazorpayGateway } from "@/services/gateway.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body: unknown = await request.json().catch(() => null);
    const parsed = activateGatewaySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid activation payload."
      );
    }

    const overview = await activateOrDisableRazorpayGateway(actor, parsed.data);
    return jsonOk(overview);
  } catch (error) {
    return handleApiError(error);
  }
}
