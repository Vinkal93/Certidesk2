import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  listRechargePlans,
  upsertRechargePlan,
} from "@/services/recharge-catalog.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const upsertPlanSchema = z.object({
  id: z.string().trim().min(2).max(40),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(4).max(200),
  amountRupees: z.coerce.number().min(100).max(100000),
  bonusRupees: z.coerce.number().min(0).max(50000),
  enabled: z.boolean(),
  displayOrder: z.coerce.number().int().min(1).max(100),
  promoEligible: z.boolean(),
  promoLabel: z.string().trim().max(60).nullable().optional(),
  startsAt: z.string().trim().nullable().optional(),
  endsAt: z.string().trim().nullable().optional(),
  bonusExpiryDays: z.coerce.number().int().min(1).max(3650).nullable().optional(),
  maxUsesPerInstitute: z.coerce.number().int().min(1).max(1000).nullable().optional(),
});

export async function GET() {
  try {
    await requireSessionUser("super_admin");
    const plans = await listRechargePlans(true);
    return jsonOk({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = upsertPlanSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid recharge plan payload."
      );
    }

    const plan = await upsertRechargePlan(actor, {
      id: parsed.data.id,
      title: parsed.data.title,
      description: parsed.data.description,
      amountPaise: Math.round(parsed.data.amountRupees * 100),
      bonusPaise: Math.round(parsed.data.bonusRupees * 100),
      enabled: parsed.data.enabled,
      displayOrder: parsed.data.displayOrder,
      promoEligible: parsed.data.promoEligible,
      promoLabel: parsed.data.promoLabel ?? null,
      startsAt: parsed.data.startsAt || null,
      endsAt: parsed.data.endsAt || null,
      bonusExpiryDays: parsed.data.bonusExpiryDays ?? null,
      maxUsesPerInstitute: parsed.data.maxUsesPerInstitute ?? null,
    });

    return jsonOk({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
