import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  approveRecoveryOperation,
  createRecoveryAssessment,
  executeRecoveryOperation,
  getRecoveryOverview,
} from "@/services/emergency-ops.service";

const CreateAssessmentSchema = z.object({
  action: z.literal("assess"),
  relatedIncidentId: z.string().optional(),
  recoveryType: z.enum([
    "restore_service",
    "end_maintenance",
    "release_lockdown",
    "verify_auth",
    "verify_firestore",
    "verify_app_health",
    "verify_razorpay",
  ]),
  targetServiceId: z.string().optional(),
  targetInstituteId: z.string().optional(),
  targetResourceId: z.string().optional(),
  objective: z.string().trim().min(5).max(400),
  impactAssessment: z.string().trim().min(5).max(800),
  priority: z.enum(["p1", "p2", "p3"]),
  internalNotes: z.string().max(1000).optional(),
});

const ApproveSchema = z.object({
  action: z.literal("approve"),
  id: z.string().min(3),
});

const ExecuteSchema = z.object({
  action: z.literal("execute"),
  id: z.string().min(3),
  reason: z.string().trim().min(3).max(400),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await getRecoveryOverview(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "approve") {
      const parsed = ApproveSchema.parse(body);
      const operation = await approveRecoveryOperation(actor, parsed.id);
      return jsonOk({ operation });
    }

    if (body.action === "execute") {
      const parsed = ExecuteSchema.parse(body);
      const operation = await executeRecoveryOperation(actor, {
        id: parsed.id,
        reason: parsed.reason,
      });
      return jsonOk({ operation });
    }

    const parsed = CreateAssessmentSchema.parse(body);
    const operation = await createRecoveryAssessment(actor, {
      recoveryType: parsed.recoveryType,
      objective: parsed.objective,
      impactAssessment: parsed.impactAssessment,
      priority: parsed.priority,
      ...(parsed.relatedIncidentId
        ? { relatedIncidentId: parsed.relatedIncidentId }
        : {}),
      ...(parsed.targetServiceId ? { targetServiceId: parsed.targetServiceId } : {}),
      ...(parsed.targetInstituteId
        ? { targetInstituteId: parsed.targetInstituteId }
        : {}),
      ...(parsed.targetResourceId ? { targetResourceId: parsed.targetResourceId } : {}),
      ...(parsed.internalNotes ? { internalNotes: parsed.internalNotes } : {}),
    });
    return jsonOk({ operation }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
