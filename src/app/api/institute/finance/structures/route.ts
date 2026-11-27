import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  createFeeStructure,
  listFeeStructures,
} from "@/services/institute-finance.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const createStructureSchema = z.object({
  name: z.string().trim().min(2).max(120),
  courseName: z.string().trim().min(2).max(120),
  frequency: z.enum(["one_time", "monthly", "installment", "admission"]),
  amountRupees: z.coerce.number().positive(),
  admissionFeeRupees: z.coerce.number().min(0).optional(),
  lateFeeRupees: z.coerce.number().min(0).optional(),
  dueDayOfMonth: z.coerce.number().int().min(1).max(28).nullable().optional(),
  discountEligible: z.boolean().optional(),
  effectiveFrom: z.string().optional(),
});

export async function GET() {
  try {
    const actor = await requireSessionUser();
    const items = await listFeeStructures(actor);
    return jsonOk({ structures: items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = createStructureSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid fee structure payload."
      );
    }
    const created = await createFeeStructure(actor, parsed.data);
    return jsonOk({ structure: created }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
