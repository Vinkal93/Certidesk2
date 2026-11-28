import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import {
  getInstituteFinanceOverview,
  type FinanceDateRangeKey,
} from "@/services/institute-finance.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const sp = request.nextUrl.searchParams;
    const range = (sp.get("range") || "month") as FinanceDateRangeKey;
    const from = sp.get("from") || undefined;
    const to = sp.get("to") || undefined;
    const overview = await getInstituteFinanceOverview(actor, { range, from, to });
    return jsonOk(overview);
  } catch (error) {
    return handleApiError(error);
  }
}
