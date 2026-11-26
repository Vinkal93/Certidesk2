import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { createStaffSchema } from "@/lib/validation/student";
import { createInstituteStaffMember, listInstituteStaff } from "@/services/staff.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    const staff = await listInstituteStaff(actor);
    return jsonOk({ staff });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid staff payload."
      );
    }

    const result = await createInstituteStaffMember(actor, parsed.data);
    return jsonOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
