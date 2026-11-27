import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  createServiceRestriction,
  listServiceRestrictions,
  restoreServiceRestriction,
} from "@/services/emergency-ops.service";

const CreateRestrictionSchema = z.object({
  action: z.literal("create"),
  serviceId: z.string().min(2),
  restrictionType: z.enum([
    "global_disable",
    "institute_disable",
    "read_only",
    "operation_disable",
    "temporary",
    "scheduled",
  ]),
  scope: z.enum(["global", "institute"]),
  instituteIds: z.array(z.string()).default([]),
  disabledOperations: z.array(z.string()).default([]),
  reason: z.string().trim().min(4).max(400),
  userMessage: z.string().trim().min(4).max(400),
  internalNotes: z.string().max(1000).optional(),
  startAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

const RestoreRestrictionSchema = z.object({
  action: z.literal("restore"),
  id: z.string().min(3),
  reason: z.string().trim().min(3).max(400),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await listServiceRestrictions(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "restore") {
      const parsed = RestoreRestrictionSchema.parse(body);
      const restriction = await restoreServiceRestriction(actor, parsed);
      return jsonOk({ restriction });
    }

    const parsed = CreateRestrictionSchema.parse(body);
    const restriction = await createServiceRestriction(actor, {
      serviceId: parsed.serviceId,
      restrictionType: parsed.restrictionType,
      scope: parsed.scope,
      instituteIds: parsed.instituteIds,
      disabledOperations: parsed.disabledOperations,
      reason: parsed.reason,
      userMessage: parsed.userMessage,
      ...(parsed.internalNotes !== undefined
        ? { internalNotes: parsed.internalNotes }
        : {}),
      ...(parsed.startAt !== undefined ? { startAt: parsed.startAt } : {}),
      ...(parsed.expiresAt !== undefined ? { expiresAt: parsed.expiresAt } : {}),
    });
    return jsonOk({ restriction }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
