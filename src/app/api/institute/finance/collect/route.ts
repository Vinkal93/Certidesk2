import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { collectInstituteFee } from "@/services/institute-finance.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const collectSchema = z.object({
  feePlanId: z.string().min(1),
  amountRupees: z.coerce.number().positive(),
  discountRupees: z.coerce.number().min(0).optional(),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "razorpay", "other"]),
  feePeriod: z.string().trim().max(80).optional(),
  reference: z.string().trim().max(80).optional(),
  accountId: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = collectSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid fee collection payload."
      );
    }
    const result = await collectInstituteFee(actor, parsed.data);
    return jsonOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
