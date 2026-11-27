import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { admitStudentSchema } from "@/lib/validation/student";
import { admitStudent, listInstituteStudentsPaginated } from "@/services/student.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "active" || statusParam === "disabled" ? statusParam : "all";
    const page = Number(searchParams.get("page") ?? "1") || 1;

    const result = await listInstituteStudentsPaginated(actor, {
      search,
      status,
      page,
      pageSize: 15,
    });
    return jsonOk({ ...result, students: result.items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = admitStudentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid student admission payload."
      );
    }

    const headerKey = request.headers.get("x-idempotency-key")?.trim();
    const result = await admitStudent(actor, {
      ...parsed.data,
      ...(headerKey && !parsed.data.idempotencyKey ? { idempotencyKey: headerKey } : {}),
    });
    return jsonOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
