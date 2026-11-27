import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { refundInstituteFee } from "@/services/institute-finance.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const refundSchema = z.object({
  paymentId: z.string().min(1),
  amountRupees: z.coerce.number().positive(),
  reason: z.string().trim().min(5).max(200),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "razorpay", "other"]),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid refund payload."
      );
    }
    const refund = await refundInstituteFee(actor, parsed.data);
    return jsonOk({ refund }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
