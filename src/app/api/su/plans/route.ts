import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  createSubscriptionPlan,
  listSubscriptionPlans,
} from "@/services/su-platform.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const planSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(""),
  monthlyDisplayRupees: z.coerce.number().min(0),
  yearlyDisplayRupees: z.coerce.number().min(0),
  maxStudents: z.coerce.number().int().min(1),
  maxStaff: z.coerce.number().int().min(1),
  storageLimitMb: z.coerce.number().int().min(50),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const plans = await listSubscriptionPlans(actor);
    return jsonOk({ plans });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid plan payload."
      );
    }
    const plan = await createSubscriptionPlan(actor, parsed.data);
    return jsonOk({ plan }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
