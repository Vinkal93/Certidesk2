import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { getSecurityCenterOverview } from "@/services/security-center.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { searchParams } = new URL(request.url);
    const data = await getSecurityCenterOverview(actor, {
      window: searchParams.get("window") ?? "30d",
      role: searchParams.get("role") ?? "all",
      instituteId: searchParams.get("instituteId") ?? undefined,
    });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}
