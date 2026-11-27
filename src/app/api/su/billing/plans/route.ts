import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  createOrPublishPlanVersion,
  listPlanVersions,
  updatePlanVersionStatus,
} from "@/services/billing.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const planActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    planId: z.string().min(2),
    planCode: z.string().trim().min(2).max(32),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(4).max(240),
    billingModel: z.enum(["prepaid_wallet", "subscription", "hybrid"]),
    priceRupees: z.coerce.number().min(0).max(500000),
    billingInterval: z.enum(["monthly", "yearly", "one_time"]),
    trialDays: z.coerce.number().int().min(0).max(90),
    gracePeriodDays: z.coerce.number().int().min(0).max(60),
    overagePolicy: z.enum(["block", "pay_per_use", "grace_warn"]),
    maxStudents: z.coerce.number().int().min(1).max(1000000),
    maxStaff: z.coerce.number().int().min(1).max(100000),
    storageLimitMb: z.coerce.number().int().min(100).max(10000000),
    maxCertificatesPerMonth: z.coerce.number().int().min(0).max(1000000),
    maxMarksheetsPerMonth: z.coerce.number().int().min(0).max(1000000),
    maxApiCallsPerDay: z.coerce.number().int().min(0).max(10000000),
    features: z.array(z.string().min(2)),
    isPublic: z.boolean(),
    status: z.enum(["draft", "active"]),
  }),
  z.object({
    action: z.literal("set_status"),
    versionId: z.string().min(2),
    status: z.enum(["active", "retired"]),
  }),
]);

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const versions = await listPlanVersions(actor);
    return jsonOk({ versions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body: unknown = await request.json().catch(() => null);
    const parsed = planActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid plan version payload."
      );
    }

    if (parsed.data.action === "set_status") {
      const version = await updatePlanVersionStatus(
        actor,
        parsed.data.versionId,
        parsed.data.status
      );
      return jsonOk({ version });
    }

    const d = parsed.data;
    const version = await createOrPublishPlanVersion(actor, {
      planId: d.planId,
      planCode: d.planCode,
      name: d.name,
      description: d.description,
      billingModel: d.billingModel,
      pricePaise: Math.round(d.priceRupees * 100),
      currency: "INR",
      billingInterval: d.billingInterval,
      trialDays: d.trialDays,
      gracePeriodDays: d.gracePeriodDays,
      overagePolicy: d.overagePolicy,
      allowances: {
        maxStudents: d.maxStudents,
        maxStaff: d.maxStaff,
        storageLimitBytes: d.storageLimitMb * 1024 * 1024,
        maxCertificatesPerMonth: d.maxCertificatesPerMonth,
        maxMarksheetsPerMonth: d.maxMarksheetsPerMonth,
        maxApiCallsPerDay: d.maxApiCallsPerDay,
      },
      features: d.features,
      isPublic: d.isPublic,
      status: d.status,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveUntil: null,
    });

    return jsonOk({ version }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
