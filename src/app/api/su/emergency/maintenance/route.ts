import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  createOrScheduleMaintenance,
  listMaintenanceEvents,
  manageMaintenanceEvent,
} from "@/services/emergency-ops.service";

const CreateMaintenanceSchema = z.object({
  action: z.literal("create"),
  name: z.string().trim().min(3).max(140),
  description: z.string().trim().min(5).max(1000),
  type: z.enum([
    "full_platform",
    "selected_service",
    "selected_institute",
    "scheduled",
    "emergency",
  ]),
  scope: z.enum(["platform", "services", "institutes"]),
  affectedServices: z.array(z.string()).default([]),
  affectedInstituteIds: z.array(z.string()).default([]),
  startAt: z.string().min(4),
  expectedEndAt: z.string().min(4),
  publicMessage: z.string().trim().min(5).max(500),
  internalNotes: z.string().max(1000).optional(),
  notifyInstitutes: z.boolean().default(true),
  activateImmediately: z.boolean().default(false),
});

const ManageMaintenanceSchema = z.object({
  action: z.enum(["disable", "cancel", "extend", "edit"]),
  id: z.string().min(3),
  reason: z.string().trim().min(3).max(400),
  expectedEndAt: z.string().optional(),
  publicMessage: z.string().max(500).optional(),
  internalNotes: z.string().max(1000).optional(),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await listMaintenanceEvents(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "create") {
      const parsed = CreateMaintenanceSchema.parse(body);
      const event = await createOrScheduleMaintenance(actor, {
        ...parsed,
        ...(parsed.internalNotes !== undefined
          ? { internalNotes: parsed.internalNotes }
          : {}),
      });
      return jsonOk({ event }, 201);
    }

    const parsed = ManageMaintenanceSchema.parse(body);
    const event = await manageMaintenanceEvent(actor, {
      id: parsed.id,
      action: parsed.action,
      reason: parsed.reason,
      ...(parsed.expectedEndAt !== undefined
        ? { expectedEndAt: parsed.expectedEndAt }
        : {}),
      ...(parsed.publicMessage !== undefined
        ? { publicMessage: parsed.publicMessage }
        : {}),
      ...(parsed.internalNotes !== undefined
        ? { internalNotes: parsed.internalNotes }
        : {}),
    });
    return jsonOk({ event });
  } catch (error) {
    return handleApiError(error);
  }
}
