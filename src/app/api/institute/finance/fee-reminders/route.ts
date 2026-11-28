import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";
import {
  createFeeReminderRule,
  evaluateFeeRemindersForInstitute,
  listFeeReminderRulesAndDashboard,
} from "@/services/fee-reminder.service";

const createRuleSchema = z.object({
  action: z.enum(["create", "evaluate_now"]).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  triggerType: z
    .enum([
      "before_due_date",
      "on_due_date",
      "after_due_date",
      "specific_calendar_date",
      "specific_day_of_month",
      "between_dates",
      "monthly_recurring",
    ])
    .optional(),
  offsetDays: z.coerce.number().int().min(0).max(60).optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  specificDate: z.string().optional(),
  rangeStartDay: z.coerce.number().int().min(1).max(31).optional(),
  rangeEndDay: z.coerce.number().int().min(1).max(31).optional(),
  targetAudience: z
    .enum(["all_students", "specific_courses", "specific_batches"])
    .optional(),
  courseIds: z.array(z.string()).optional(),
  batchIds: z.array(z.string()).optional(),
  feeStatusFilters: z.array(z.enum(["any", "pending", "overdue", "upcoming"])).optional(),
  targetLogic: z.enum(["AND", "OR"]).optional(),
  titleTemplate: z.string().trim().min(2).max(160).optional(),
  messageTemplate: z.string().trim().min(2).max(1500).optional(),
  reminderType: z.enum(["upcoming", "due", "overdue"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  allowDismiss: z.boolean().optional(),
  allowRemindLater: z.boolean().optional(),
  remindLaterHours: z.coerce.number().int().min(1).max(168).optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const actor = await requireSessionUser();
    const data = await listFeeReminderRulesAndDashboard(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await req.json().catch(() => null);
    const parsed = createRuleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid fee reminder rule payload."
      );
    }

    if (parsed.data.action === "evaluate_now") {
      const institute = await resolveAuthorizedInstitute(actor);
      const result = await evaluateFeeRemindersForInstitute(institute.id);
      const refreshed = await listFeeReminderRulesAndDashboard(actor);
      return jsonOk({ ...result, ...refreshed });
    }

    if (
      !parsed.data.name ||
      !parsed.data.triggerType ||
      !parsed.data.titleTemplate ||
      !parsed.data.messageTemplate
    ) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Rule name, trigger condition, title, and message are required."
      );
    }

    const rule = await createFeeReminderRule(actor, {
      name: parsed.data.name,
      triggerType: parsed.data.triggerType,
      offsetDays: parsed.data.offsetDays,
      dayOfMonth: parsed.data.dayOfMonth,
      specificDate: parsed.data.specificDate,
      rangeStartDay: parsed.data.rangeStartDay,
      rangeEndDay: parsed.data.rangeEndDay,
      targetAudience: parsed.data.targetAudience ?? "all_students",
      courseIds: parsed.data.courseIds,
      batchIds: parsed.data.batchIds,
      feeStatusFilters: parsed.data.feeStatusFilters ?? ["pending"],
      targetLogic: parsed.data.targetLogic ?? "AND",
      titleTemplate: parsed.data.titleTemplate,
      messageTemplate: parsed.data.messageTemplate,
      reminderType: parsed.data.reminderType ?? "due",
      priority: parsed.data.priority ?? "normal",
      allowDismiss: parsed.data.allowDismiss ?? true,
      allowRemindLater: parsed.data.allowRemindLater ?? true,
      remindLaterHours: parsed.data.remindLaterHours ?? 24,
      active: parsed.data.active ?? true,
      expiresAt: parsed.data.expiresAt,
    });
    const refreshed = await listFeeReminderRulesAndDashboard(actor);
    return jsonOk({ rule, ...refreshed }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
