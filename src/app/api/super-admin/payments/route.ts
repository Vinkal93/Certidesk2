import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { listPlatformPayments } from "@/services/payment.service";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser("super_admin");
    const { searchParams } = new URL(request.url);
    const envParam = searchParams.get("environment");
    const environment = envParam === "test" || envParam === "live" ? envParam : "all";
    const status = searchParams.get("status") ?? undefined;
    const instituteId = searchParams.get("instituteId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const data = await listPlatformPayments({
      environment,
      status,
      instituteId,
      search,
    });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}
