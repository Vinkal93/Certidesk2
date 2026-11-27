import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { assertServiceAllowed } from "@/services/emergency-policy.service";
import { createWalletRechargeOrder } from "@/services/payment.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const createOrderSchema = z
  .object({
    planId: z.string().min(1).optional(),
    amountRupees: z.coerce.number().min(100).max(100000).optional(),
  })
  .refine((data) => Boolean(data.planId) || data.amountRupees !== undefined, {
    message: "Select a recharge plan or enter an amount between ₹100 and ₹1,00,000.",
  });

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    await assertServiceAllowed({
      serviceId: "payments_razorpay",
      instituteId: actor.instituteId,
      operation: "create_order",
      isWrite: true,
      actorRole: actor.role,
    });
    const body: unknown = await request.json().catch(() => null);
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ??
          "Select a valid recharge plan or amount between ₹100 and ₹1,00,000."
      );
    }

    const order = await createWalletRechargeOrder(actor, {
      planId: parsed.data.planId,
      amountRupees: parsed.data.amountRupees,
    });
    return jsonOk(order, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
