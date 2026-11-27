import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { listAuditLogsPaginated } from "@/services/security-center.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { searchParams } = new URL(request.url);
    const result = await listAuditLogsPaginated(actor, {
      search: searchParams.get("search") ?? undefined,
      action: searchParams.get("action") ?? "all",
      actorRole: searchParams.get("actorRole") ?? "all",
      instituteId: searchParams.get("instituteId") ?? undefined,
      page: Number(searchParams.get("page") ?? "1") || 1,
      pageSize: Number(searchParams.get("pageSize") ?? "25") || 25,
    });
    return jsonOk({ ...result, logs: result.items });
  } catch (error) {
    return handleApiError(error);
  }
}
