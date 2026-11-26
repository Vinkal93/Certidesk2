import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  assignInstituteSubscription,
  listSubscriptionsAndOverrides,
  setEntitlementOverride,
} from "@/services/entitlement.service";

const AssignSubSchema = z.object({
  action: z.literal("assign_subscription").default("assign_subscription"),
  instituteId: z.string().min(2),
  planId: z.string().min(2),
  billingCycle: z.enum(["monthly", "yearly"]),
  status: z.enum(["active", "trialing", "past_due", "suspended", "cancelled"]).optional(),
  customPriceRupees: z.number().nonnegative().optional(),
});

const OverrideSchema = z.object({
  action: z.literal("set_override"),
  instituteId: z.string().min(2),
  featureKey: z.string().min(2).max(64),
  enabled: z.boolean(),
  limitOverride: z.number().int().nonnegative().optional(),
  reason: z.string().min(3).max(300),
  expiresAt: z.string().optional(),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await listSubscriptionsAndOverrides(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "set_override") {
      const parsed = OverrideSchema.parse(body);
      const override = await setEntitlementOverride(actor, {
        instituteId: parsed.instituteId,
        featureKey: parsed.featureKey,
        enabled: parsed.enabled,
        reason: parsed.reason,
        ...(parsed.limitOverride !== undefined
          ? { limitOverride: parsed.limitOverride }
          : {}),
        ...(parsed.expiresAt !== undefined && parsed.expiresAt.trim() !== ""
          ? { expiresAt: parsed.expiresAt }
          : {}),
      });
      return jsonOk({ override });
    }

    const parsed = AssignSubSchema.parse(body);
    const subscription = await assignInstituteSubscription(actor, {
      instituteId: parsed.instituteId,
      planId: parsed.planId,
      billingCycle: parsed.billingCycle,
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.customPriceRupees !== undefined
        ? { customPriceRupees: parsed.customPriceRupees }
        : {}),
    });
    return jsonOk({ subscription });
  } catch (error) {
    return handleApiError(error);
  }
}
