import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  getCurrentBillingPeriod,
  getUsageOverview,
  recordUsageEvent,
} from "@/services/metering.service";

const RecordUsageSchema = z.object({
  instituteId: z.string().min(2),
  metricKey: z.enum([
    "students",
    "staff",
    "storage_bytes",
    "certificates",
    "marksheets",
    "api_requests",
    "file_uploads",
    "messaging",
    "background_jobs",
  ]),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1).max(32),
  sourceOperation: z.string().min(2).max(120),
  idempotencyKey: z.string().min(2).max(120),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const period =
      request.nextUrl.searchParams.get("period") ?? getCurrentBillingPeriod();
    const overview = await getUsageOverview(actor, period);
    return jsonOk(overview);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRecentSuperAdminAuth();
    const body = RecordUsageSchema.parse(await request.json());
    const result = await recordUsageEvent({
      instituteId: body.instituteId,
      metricKey: body.metricKey,
      quantity: body.quantity,
      unit: body.unit,
      sourceOperation: body.sourceOperation,
      idempotencyKey: body.idempotencyKey,
      ...(body.billingPeriod !== undefined ? { billingPeriod: body.billingPeriod } : {}),
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
