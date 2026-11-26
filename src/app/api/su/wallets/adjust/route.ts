import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRecentSuperAdminAuth } from "@/lib/security/session";
import { adjustInstituteWalletAtomic } from "@/services/su-platform.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const adjustSchema = z.object({
  instituteId: z.string().min(1),
  type: z.enum(["credit", "debit"]),
  amountRupees: z.coerce.number().positive(),
  reason: z.string().trim().min(5).max(200),
  idempotencyKey: z.string().trim().min(4).max(80),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body: unknown = await request.json().catch(() => null);
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid wallet adjustment payload."
      );
    }
    const result = await adjustInstituteWalletAtomic(actor, parsed.data);
    return jsonOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
