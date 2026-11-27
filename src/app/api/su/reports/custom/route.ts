import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  listSavedDefinitionsAndSchedules,
  runApprovedCustomReport,
  saveReportDefinition,
  saveReportSchedule,
} from "@/services/reports.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const customReportActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("run"),
    dataset: z.enum([
      "institutes",
      "wallet_transactions",
      "payment_orders",
      "billing_invoices",
      "security_login_events",
      "audit_logs",
    ]),
    range: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
  }),
  z.object({
    action: z.literal("save_definition"),
    name: z.string().trim().min(2).max(80),
    category: z.enum(["business", "financial", "usage", "security"]),
    dataset: z.enum([
      "institutes",
      "wallet_transactions",
      "payment_orders",
      "billing_invoices",
      "security_login_events",
      "audit_logs",
    ]),
    range: z.enum(["7d", "30d", "90d", "all"]),
  }),
  z.object({
    action: z.literal("save_schedule"),
    name: z.string().trim().min(2).max(80),
    category: z.enum(["business", "financial", "usage", "security"]),
    cadence: z.enum(["daily", "weekly", "monthly"]),
    timezone: z.string().trim().min(2).max(60),
    recipients: z.array(z.string().trim().email()).min(1).max(10),
    enabled: z.boolean(),
  }),
]);

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await listSavedDefinitionsAndSchedules(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = customReportActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid report request."
      );
    }

    if (parsed.data.action === "run") {
      const result = await runApprovedCustomReport(actor, {
        dataset: parsed.data.dataset,
        range: parsed.data.range,
      });
      return jsonOk(result);
    }

    if (parsed.data.action === "save_definition") {
      const definition = await saveReportDefinition(actor, parsed.data);
      return jsonOk({ definition }, 201);
    }

    const schedule = await saveReportSchedule(actor, parsed.data);
    return jsonOk({ schedule }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
