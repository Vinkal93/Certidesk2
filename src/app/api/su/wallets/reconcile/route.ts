import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { reconcileInstituteWallets } from "@/services/wallet-reconciliation.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const instituteId = request.nextUrl.searchParams.get("instituteId") || undefined;
    const report = await reconcileInstituteWallets(actor, instituteId);
    return jsonOk(report);
  } catch (error) {
    return handleApiError(error);
  }
}
