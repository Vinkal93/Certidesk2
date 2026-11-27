import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  getEnterpriseIncidentDetail,
  updateEnterpriseIncident,
} from "@/services/emergency-ops.service";

const PatchDetailSchema = z.object({
  action: z.enum([
    "transition_status",
    "assign",
    "change_severity",
    "add_comment",
    "link_incident",
  ]),
  status: z
    .enum([
      "detected",
      "acknowledged",
      "investigating",
      "mitigating",
      "monitoring",
      "resolved",
      "closed",
    ])
    .optional(),
  assignedToUid: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
  comment: z.string().max(1500).optional(),
  commentType: z.enum(["comment", "evidence"]).optional(),
  resolutionSummary: z.string().max(1000).optional(),
  relatedIncidentId: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { id } = await context.params;
    const detail = await getEnterpriseIncidentDetail(actor, id);
    return jsonOk(detail);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const { id } = await context.params;
    const body = PatchDetailSchema.parse(await request.json());
    const incident = await updateEnterpriseIncident(actor, { id, ...body });
    return jsonOk({ incident });
  } catch (error) {
    return handleApiError(error);
  }
}
