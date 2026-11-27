import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  listSecurityAlertsAndRules,
  updateSecurityAlertLifecycle,
  updateSecurityAlertRuleConfig,
} from "@/services/security-center.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const alertPostSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("alert"),
    alertId: z.string().min(2),
    action: z.enum([
      "acknowledge",
      "investigate",
      "resolve",
      "false_positive",
      "add_note",
    ]),
    note: z.string().trim().max(500).optional(),
    reason: z.string().trim().max(300).optional(),
  }),
  z.object({
    type: z.literal("rule"),
    id: z.string().min(2),
    enabled: z.boolean(),
    threshold: z.coerce.number().int().min(1).max(10000000),
    windowMinutes: z.coerce.number().int().min(1).max(1440),
    cooldownMinutes: z.coerce.number().int().min(1).max(1440),
    severity: z.enum(["critical", "high", "medium", "low"]),
  }),
]);

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { searchParams } = new URL(request.url);
    const data = await listSecurityAlertsAndRules(actor, {
      status: searchParams.get("status") ?? "all",
      severity: searchParams.get("severity") ?? "all",
      search: searchParams.get("search") ?? undefined,
    });
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = alertPostSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid alert request."
      );
    }

    if (parsed.data.type === "rule") {
      const actor = await requireRecentSuperAdminAuth();
      const rule = await updateSecurityAlertRuleConfig(actor, parsed.data);
      return jsonOk({ rule });
    }

    const actor = await requireSessionUser("super_admin");
    const alert = await updateSecurityAlertLifecycle(actor, parsed.data);
    return jsonOk({ alert });
  } catch (error) {
    return handleApiError(error);
  }
}
