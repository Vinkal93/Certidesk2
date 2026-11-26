import { requireSessionUser } from "@/lib/security/session";
import { getSafeGatewayOverview } from "@/services/gateway.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function GET() {
  try {
    await requireSessionUser("super_admin");
    const overview = await getSafeGatewayOverview();
    return jsonOk(overview);
  } catch (error) {
    return handleApiError(error);
  }
}
