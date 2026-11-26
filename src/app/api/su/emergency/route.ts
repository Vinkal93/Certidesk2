import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  applyEmergencyAction,
  getEmergencyOverview,
  rollbackEmergencyAction,
} from "@/services/emergency.service";

const UpdateControlsSchema = z.object({
  action: z.literal("update_controls").default("update_controls"),
  flags: z.object({
    maintenanceMode: z.boolean().optional(),
    readOnlyMode: z.boolean().optional(),
    registrationPaused: z.boolean().optional(),
    paymentsPaused: z.boolean().optional(),
    certificatesPaused: z.boolean().optional(),
  }),
  reason: z.string().min(3).max(400),
  expiresInMinutes: z.number().int().positive().max(10080).optional(),
});

const RollbackSchema = z.object({
  action: z.literal("rollback"),
  actionId: z.string().min(3),
  reason: z.string().min(3).max(400),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const overview = await getEmergencyOverview(actor);
    return jsonOk(overview);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "rollback") {
      const parsed = RollbackSchema.parse(body);
      const result = await rollbackEmergencyAction(actor, parsed.actionId, parsed.reason);
      return jsonOk(result);
    }

    const parsed = UpdateControlsSchema.parse(body);
    const result = await applyEmergencyAction(actor, {
      flags: {
        ...(parsed.flags.maintenanceMode !== undefined
          ? { maintenanceMode: parsed.flags.maintenanceMode }
          : {}),
        ...(parsed.flags.readOnlyMode !== undefined
          ? { readOnlyMode: parsed.flags.readOnlyMode }
          : {}),
        ...(parsed.flags.registrationPaused !== undefined
          ? { registrationPaused: parsed.flags.registrationPaused }
          : {}),
        ...(parsed.flags.paymentsPaused !== undefined
          ? { paymentsPaused: parsed.flags.paymentsPaused }
          : {}),
        ...(parsed.flags.certificatesPaused !== undefined
          ? { certificatesPaused: parsed.flags.certificatesPaused }
          : {}),
      },
      reason: parsed.reason,
      ...(parsed.expiresInMinutes !== undefined
        ? { expiresInMinutes: parsed.expiresInMinutes }
        : {}),
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
