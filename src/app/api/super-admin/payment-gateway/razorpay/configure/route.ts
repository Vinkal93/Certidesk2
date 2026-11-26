import { NextRequest } from "next/server";
import { requireRecentSuperAdminAuth } from "@/lib/security/session";
import { configureGatewaySchema } from "@/lib/validation/gateway";
import { configureRazorpayEnvironment } from "@/services/gateway.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body: unknown = await request.json().catch(() => null);
    const parsed = configureGatewaySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid gateway configuration."
      );
    }

    const overview = await configureRazorpayEnvironment(actor, parsed.data);
    return jsonOk(overview);
  } catch (error) {
    return handleApiError(error);
  }
}
