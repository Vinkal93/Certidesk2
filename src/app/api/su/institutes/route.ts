import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { createInstituteSchema } from "@/lib/validation/institute";
import { createInstituteWithAdmin, listInstitutes } from "@/services/institute.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser("super_admin");
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "active" || statusParam === "suspended" ? statusParam : "all";
    const page = Number(searchParams.get("page") ?? "1") || 1;

    const result = await listInstitutes({ search, status, page, pageSize: 10 });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = createInstituteSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid institute registration payload."
      );
    }

    const result = await createInstituteWithAdmin(actor, parsed.data);
    return jsonOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
