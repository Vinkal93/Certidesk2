import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { createBatchSchema } from "@/lib/validation/academic";
import { createBatch, listBatches } from "@/services/academic.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    const batches = await listBatches(actor);
    return jsonOk({ batches });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = createBatchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid batch payload."
      );
    }
    const batch = await createBatch(actor, parsed.data);
    return jsonOk({ batch }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
