import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireSessionUser } from "@/lib/security/session";
import { listAllPlatformUsers } from "@/services/su-users.service";

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await listAllPlatformUsers(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}
