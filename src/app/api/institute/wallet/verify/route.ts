import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { verifyAndCreditCheckoutPayment } from "@/services/payment.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = verifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid payment verification payload.");
    }

    const result = await verifyAndCreditCheckoutPayment(actor, parsed.data);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
