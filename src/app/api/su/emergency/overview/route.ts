import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireSessionUser } from "@/lib/security/session";
import { getEmergencyDashboardData } from "@/services/emergency-ops.service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const sp = request.nextUrl.searchParams;
    const rawRange = sp.get("range");
    const range =
      rawRange === "24h" ||
      rawRange === "7d" ||
      rawRange === "30d" ||
      rawRange === "custom"
        ? rawRange
        : "24h";
    const from = sp.get("from") ?? undefined;
    const to = sp.get("to") ?? undefined;

    const data = await getEmergencyDashboardData(actor, {
      range,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}
