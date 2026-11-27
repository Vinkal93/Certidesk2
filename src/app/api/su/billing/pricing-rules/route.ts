import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import { listPricingRules, upsertPricingRule } from "@/services/billing.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const pricingRuleSchema = z.object({
  id: z.string().trim().optional(),
  serviceKey: z.enum([
    "student_admission",
    "profile_edit",
    "certificate_issue",
    "marksheet_issue",
    "custom",
  ]),
  description: z.string().trim().min(3).max(200),
  amountRupees: z.coerce.number().min(0).max(100000),
  unit: z.string().trim().min(1).max(40),
  applicablePlanId: z.string().trim().nullable().optional(),
  applicableInstituteId: z.string().trim().nullable().optional(),
  minQty: z.coerce.number().int().min(1).default(1),
  maxQty: z.coerce.number().int().min(1).nullable().optional(),
  taxTreatment: z.enum(["exempt", "taxable_exclusive", "taxable_inclusive"]),
  taxRateBps: z.coerce.number().int().min(0).max(5000),
  effectiveStart: z.string().min(4),
  effectiveEnd: z.string().nullable().optional(),
  status: z.enum(["active", "scheduled", "retired"]),
  reason: z.string().trim().min(3).max(240),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const rules = await listPricingRules(actor);
    return jsonOk({ rules });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body: unknown = await request.json().catch(() => null);
    const parsed = pricingRuleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid pricing rule payload."
      );
    }

    const d = parsed.data;
    const rule = await upsertPricingRule(actor, {
      id: d.id,
      serviceKey: d.serviceKey,
      description: d.description,
      amountPaise: Math.round(d.amountRupees * 100),
      currency: "INR",
      unit: d.unit,
      applicablePlanId: d.applicablePlanId || null,
      applicableInstituteId: d.applicableInstituteId || null,
      minQty: d.minQty,
      maxQty: d.maxQty ?? null,
      taxTreatment: d.taxTreatment,
      taxRateBps: d.taxRateBps,
      effectiveStart: d.effectiveStart,
      effectiveEnd: d.effectiveEnd || null,
      status: d.status,
      reason: d.reason,
    });
    return jsonOk({ rule });
  } catch (error) {
    return handleApiError(error);
  }
}
