import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { assertServiceAllowed } from "@/services/emergency-policy.service";
import {
  collectStudentFeePayment,
  createStudentFeePlan,
  listInstituteFees,
} from "@/services/fee.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const feeActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_plan"),
    studentId: z.string().min(1),
    totalFeeRupees: z.coerce.number().min(0),
    discountRupees: z.coerce.number().min(0).default(0),
  }),
  z.object({
    action: z.literal("collect_payment"),
    feePlanId: z.string().min(1),
    amountRupees: z.coerce.number().positive(),
    paymentMode: z.enum(["cash", "upi", "bank_transfer", "card"]),
    note: z.string().trim().max(200).default(""),
  }),
]);

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    const data = await listInstituteFees(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    await assertServiceAllowed({
      serviceId: "fee_management",
      instituteId: actor.instituteId,
      operation: "collect_fee",
      isWrite: true,
      actorRole: actor.role,
    });
    const body: unknown = await request.json().catch(() => null);
    const parsed = feeActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid fee operation."
      );
    }

    if (parsed.data.action === "create_plan") {
      const plan = await createStudentFeePlan(actor, parsed.data);
      return jsonOk({ plan }, 201);
    }

    const result = await collectStudentFeePayment(actor, parsed.data);
    return jsonOk(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
