import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  getCentralPricingConfig,
  updateCentralPricingConfig,
} from "@/services/su-platform.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const pricingSchema = z.object({
  admissionFeeRupees: z.coerce.number().min(0).max(50000),
  profileUpdateFeeRupees: z.coerce.number().min(0).max(50000),
  certificateFeeRupees: z.coerce.number().min(0).max(50000),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await getCentralPricingConfig(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body: unknown = await request.json().catch(() => null);
    const parsed = pricingSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid pricing configuration."
      );
    }
    const updated = await updateCentralPricingConfig(actor, parsed.data);
    return jsonOk({ pricing: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
