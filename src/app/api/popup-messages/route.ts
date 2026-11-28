import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { requireSessionUser } from "@/lib/security/session";
import {
  listPopupMessagesForRecipient,
  listSentPopupMessages,
  markPopupMessageRead,
  sendInstitutePopupMessage,
  sendSuperAdminPopupMessage,
} from "@/services/popup-messages.service";
import {
  actOnStudentFeeReminder,
  listActiveStudentFeeReminders,
} from "@/services/fee-reminder.service";

const SendPopupSchema = z.object({
  action: z.literal("send"),
  targetType: z.enum(["institute", "all_institutes", "student", "all_students"]),
  instituteId: z.string().optional(),
  studentId: z.string().optional(),
  category: z.enum([
    "announcement",
    "fee_reminder",
    "exam_notice",
    "billing_alert",
    "urgent",
  ]),
  title: z.string().min(2).max(120),
  message: z.string().min(2).max(1500),
  ctaLabel: z.string().max(40).optional(),
  ctaHref: z.string().max(200).optional(),
});

const MarkReadSchema = z.object({
  action: z.literal("mark_read"),
  messageIds: z.array(z.string().min(2)).min(1).max(25),
});

const FeeReminderActionSchema = z.object({
  action: z.literal("fee_reminder_action"),
  deliveryId: z.string().min(2),
  reminderAction: z.enum(["mark_read", "dismiss", "remind_later"]),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const mode = req.nextUrl.searchParams.get("mode");
    if (mode === "sent") {
      const sent = await listSentPopupMessages(user);
      return jsonOk({ messages: sent });
    }
    const [messages, feeReminders] = await Promise.all([
      listPopupMessagesForRecipient(user),
      user.role === "student" ? listActiveStudentFeeReminders(user) : Promise.resolve([]),
    ]);
    return jsonOk({
      messages,
      feeReminders,
      unreadCount:
        messages.filter((m) => !m.isRead).length +
        feeReminders.filter((r) => r.status === "delivered").length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const raw = await req.json();

    if (raw?.action === "mark_read") {
      const parsed = MarkReadSchema.parse(raw);
      const res = await markPopupMessageRead(user, parsed.messageIds);
      return jsonOk(res);
    }

    if (raw?.action === "fee_reminder_action") {
      const parsed = FeeReminderActionSchema.parse(raw);
      const reminder = await actOnStudentFeeReminder(
        user,
        parsed.deliveryId,
        parsed.reminderAction
      );
      return jsonOk({ reminder });
    }

    const parsed = SendPopupSchema.parse(raw);
    if (parsed.targetType === "institute" || parsed.targetType === "all_institutes") {
      const record = await sendSuperAdminPopupMessage(user, {
        targetType: parsed.targetType,
        instituteId: parsed.instituteId,
        category: parsed.category,
        title: parsed.title,
        message: parsed.message,
        ctaLabel: parsed.ctaLabel,
        ctaHref: parsed.ctaHref,
      });
      return jsonOk({ message: record });
    }

    const record = await sendInstitutePopupMessage(user, {
      targetType: parsed.targetType,
      studentId: parsed.studentId,
      category: parsed.category,
      title: parsed.title,
      message: parsed.message,
      ctaLabel: parsed.ctaLabel,
      ctaHref: parsed.ctaHref,
    });
    return jsonOk({ message: record });
  } catch (error) {
    return handleApiError(error);
  }
}
