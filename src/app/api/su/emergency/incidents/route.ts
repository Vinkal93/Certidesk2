import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  createEnterpriseIncident,
  listEnterpriseIncidents,
  updateEnterpriseIncident,
} from "@/services/emergency-ops.service";

const CreateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(2000),
  category: z.enum([
    "availability",
    "security",
    "payments",
    "authentication",
    "data_integrity",
    "performance",
    "integration",
  ]),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  affectedServices: z.array(z.string()).default([]),
  affectedInstituteIds: z.array(z.string()).default([]),
  detectionSource: z.string().trim().min(2).max(120).default("Super Admin Console"),
  assignedToUid: z.string().optional(),
  impactDescription: z.string().max(1000).optional(),
  internalNotes: z.string().max(1500).optional(),
  initialStatus: z.enum(["detected", "acknowledged", "investigating"]).optional(),
});

const PatchSchema = z.object({
  id: z.string().min(3),
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

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await listEnterpriseIncidents(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = CreateSchema.parse(await request.json());
    const incident = await createEnterpriseIncident(actor, {
      ...body,
      ...(body.assignedToUid ? { assignedToUid: body.assignedToUid } : {}),
      ...(body.impactDescription ? { impactDescription: body.impactDescription } : {}),
      ...(body.internalNotes ? { internalNotes: body.internalNotes } : {}),
      ...(body.initialStatus ? { initialStatus: body.initialStatus } : {}),
    });
    return jsonOk({ incident }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = PatchSchema.parse(await request.json());
    const incident = await updateEnterpriseIncident(actor, body);
    return jsonOk({ incident });
  } catch (error) {
    return handleApiError(error);
  }
}
