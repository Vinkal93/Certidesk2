import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { instituteActionSchema, updateInstituteSchema } from "@/lib/validation/institute";
import {
  getInstituteById,
  getInstituteTransactions,
  resetInstituteAdminAccess,
  setInstituteStatus,
  updateInstituteDetails,
} from "@/services/institute.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireSessionUser("super_admin");
    const { id } = await context.params;
    const [institute, transactions] = await Promise.all([
      getInstituteById(id),
      getInstituteTransactions(id),
    ]);
    return jsonOk({ institute, transactions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = updateInstituteSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid update payload."
      );
    }

    const institute = await updateInstituteDetails(actor, id, parsed.data);
    return jsonOk({ institute });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = instituteActionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid institute action.");
    }

    if (parsed.data.action === "activate") {
      const institute = await setInstituteStatus(actor, id, "active");
      return jsonOk({ institute });
    }
    if (parsed.data.action === "suspend") {
      const institute = await setInstituteStatus(actor, id, "suspended");
      return jsonOk({ institute });
    }

    const reset = await resetInstituteAdminAccess(actor, id);
    return jsonOk({ reset });
  } catch (error) {
    return handleApiError(error);
  }
}
