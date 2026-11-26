import { requireSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { listInstituteWalletTransactions } from "@/services/wallet.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    if (!hasStaffPermission(actor, "wallet:read")) {
      return jsonError(403, "FORBIDDEN", "Missing wallet:read permission.");
    }
    const institute = await resolveAuthorizedInstitute(actor);
    const transactions = await listInstituteWalletTransactions(institute.id);
    return jsonOk({
      walletBalancePaise: institute.walletBalancePaise,
      pricing: institute.pricing,
      transactions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
