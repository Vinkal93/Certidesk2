import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  createPlatformIncident,
  getEmergencyOverview,
  updatePlatformIncident,
} from "@/services/emergency.service";

const CreateIncidentSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(5).max(1500),
  severity: z.enum(["sev1", "sev2", "sev3", "sev4"]),
  affectedComponents: z.array(z.string().min(1)).default([]),
});

const UpdateIncidentSchema = z.object({
  id: z.string().min(3),
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
  resolutionSummary: z.string().max(1000).optional(),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const overview = await getEmergencyOverview(actor);
    return jsonOk({ incidents: overview.incidents });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = CreateIncidentSchema.parse(await request.json());
    const incident = await createPlatformIncident(actor, body);
    return jsonOk({ incident }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = UpdateIncidentSchema.parse(await request.json());
    const incident = await updatePlatformIncident(actor, {
      id: body.id,
      status: body.status,
      ...(body.resolutionSummary !== undefined
        ? { resolutionSummary: body.resolutionSummary }
        : {}),
    });
    return jsonOk({ incident });
  } catch (error) {
    return handleApiError(error);
  }
}
