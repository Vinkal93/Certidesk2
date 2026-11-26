import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { listAuditLogs } from "@/services/institute.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser("super_admin");
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || undefined;
    const logs = await listAuditLogs(action);
    return jsonOk({ logs });
  } catch (error) {
    return handleApiError(error);
  }
}
