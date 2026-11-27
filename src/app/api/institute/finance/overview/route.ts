import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const actor = await requireSessionUser();
    const overview = await getInstituteFinanceOverview(actor);
    return jsonOk(overview);
  } catch (error) {
    return handleApiError(error);
  }
}
