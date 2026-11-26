import { NextRequest } from "next/server";
import { resolveLoginIdentifierSchema } from "@/lib/validation/auth";
import { resolvePortalLoginIdentifier } from "@/services/auth.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = resolveLoginIdentifierSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid login identifier."
      );
    }

    const result = await resolvePortalLoginIdentifier(
      parsed.data.portal,
      parsed.data.identifier
    );
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
