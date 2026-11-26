import { getSessionUser } from "@/lib/security/session";
import { terminatePortalSession } from "@/services/auth.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function POST() {
  try {
    const user = await getSessionUser();
    await terminatePortalSession(user);
    return jsonOk({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
