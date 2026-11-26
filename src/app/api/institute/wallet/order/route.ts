import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { createWalletRechargeOrder } from "@/services/payment.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const createOrderSchema = z.object({
  amountRupees: z.coerce.number().min(100).max(100000),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Recharge amount must be between ₹100 and ₹1,00,000."
      );
    }

    const order = await createWalletRechargeOrder(actor, parsed.data.amountRupees);
    return jsonOk(order, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
