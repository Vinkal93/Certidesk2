import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import {
  listInstituteLogins,
  updateInstituteMemberLogin,
} from "@/services/institute-logins.service";

const UpdateLoginSchema = z.object({
  uid: z.string().min(2),
  newEmail: z.string().email().optional(),
  newPassword: z.string().min(6).max(100).optional(),
  disabled: z.boolean().optional(),
  requireChangeOnNextLogin: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (
      user.role !== "institute_admin" &&
      !(user.role === "staff" && hasStaffPermission(user, "students:write"))
    ) {
      throw new AuthError(403, "FORBIDDEN", "Permission required.");
    }
    const members = await listInstituteLogins(user);
    return jsonOk({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    if (
      user.role !== "institute_admin" &&
      !(user.role === "staff" && hasStaffPermission(user, "students:write"))
    ) {
      throw new AuthError(403, "FORBIDDEN", "Permission required.");
    }
    const body = UpdateLoginSchema.parse(await req.json());
    const result = await updateInstituteMemberLogin(user, body);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
