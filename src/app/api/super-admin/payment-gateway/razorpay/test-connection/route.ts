import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { testConnectionSchema } from "@/lib/validation/gateway";
import { testRazorpayConnection } from "@/services/gateway.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = testConnectionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid environment.");
    }

    const result = await testRazorpayConnection(actor, parsed.data.environment);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
