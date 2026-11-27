import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  activatePlatformLockdown,
  listPlatformLockdowns,
  releasePlatformLockdown,
} from "@/services/emergency-ops.service";

const ActivateSchema = z.object({
  action: z.literal("activate"),
  type: z.enum(["global", "institute", "authentication", "api_write", "admin_actions"]),
  instituteId: z.string().optional(),
  restrictedServices: z.array(z.string()).default([]),
  reason: z.string().trim().min(5).max(500),
  confirmPhrase: z.string().optional(),
});

const ReleaseSchema = z.object({
  action: z.literal("release"),
  id: z.string().min(3),
  reason: z.string().trim().min(3).max(400),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await listPlatformLockdowns(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "release") {
      const parsed = ReleaseSchema.parse(body);
      const lockdown = await releasePlatformLockdown(actor, {
        id: parsed.id,
        reason: parsed.reason,
      });
      return jsonOk({ lockdown });
    }

    const parsed = ActivateSchema.parse(body);
    const lockdown = await activatePlatformLockdown(actor, {
      type: parsed.type,
      restrictedServices: parsed.restrictedServices,
      reason: parsed.reason,
      ...(parsed.instituteId !== undefined ? { instituteId: parsed.instituteId } : {}),
      ...(parsed.confirmPhrase !== undefined
        ? { confirmPhrase: parsed.confirmPhrase }
        : {}),
    });
    return jsonOk({ lockdown }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
