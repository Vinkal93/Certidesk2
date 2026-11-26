import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRecentSuperAdminAuth } from "@/lib/security/session";
import { initiateRazorpayPaymentRefund } from "@/services/payment.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const refundSchema = z.object({
  amountRupees: z.coerce.number().positive().optional(),
  reason: z
    .string()
    .trim()
    .min(5, "Refund reason must be at least 5 characters.")
    .max(200),
  idempotencyKey: z.string().trim().min(4).max(80),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> }
) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const { paymentId } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid refund request."
      );
    }

    const result = await initiateRazorpayPaymentRefund(actor, {
      orderId: paymentId,
      amountRupees: parsed.data.amountRupees,
      reason: parsed.data.reason,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
