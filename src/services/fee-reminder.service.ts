import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection, studentsCollection } from "@/lib/firebase/firestore";
import {
  computeMonthlyDueBreakdown,
  type MonthlyDueBreakdown,
} from "@/lib/finance/monthly-dues";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";
import type { StudentFeePlanRecord } from "@/types/academic";
import type { StudentRecord } from "@/types/domain";
import type {
  FeeReminderDashboardSummary,
  FeeReminderDeliveryRecord,
  FeeReminderFeeStatus,
  FeeReminderPriority,
  FeeReminderRulePerformance,
  FeeReminderRuleRecord,
  FeeReminderTargetAudience,
  FeeReminderTargetLogic,
  FeeReminderTriggerType,
  FeeReminderType,
} from "@/types/fee-reminder";

function feeReminderRulesCol() {
  return getAdminFirestore().collection(
    "feeReminderRules"
  ) as CollectionReference<FeeReminderRuleRecord>;
}

function feeReminderDeliveriesCol() {
  return getAdminFirestore().collection(
    "feeReminderDeliveries"
  ) as CollectionReference<FeeReminderDeliveryRecord>;
}

function feePlansCol() {
  return getAdminFirestore().collection(
    "student_fee_plans"
  ) as CollectionReference<StudentFeePlanRecord>;
}

// ─── PURE EVALUATION HELPERS (EXPORTED FOR UNIT TESTS) ────────────────────────

export interface DatePartsInTz {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  isoDate: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. Nov 2026
}

export function getDatePartsInTimezone(
  date: Date,
  timeZone = "Asia/Kolkata"
): DatePartsInTz {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(date);
    const year = Number(
      parts.find((p) => p.type === "year")?.value ?? date.getFullYear()
    );
    const month = Number(
      parts.find((p) => p.type === "month")?.value ?? date.getMonth() + 1
    );
    const day = Number(parts.find((p) => p.type === "day")?.value ?? date.getDate());
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const monthLabel = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      year: "numeric",
    }).format(date);

    return {
      year,
      month,
      day,
      isoDate: `${year}-${mm}-${dd}`,
      monthKey: `${year}-${mm}`,
      monthLabel,
    };
  } catch {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return {
      year,
      month,
      day,
      isoDate: `${year}-${mm}-${dd}`,
      monthKey: `${year}-${mm}`,
      monthLabel: `${year}-${mm}`,
    };
  }
}

function diffDaysUtc(fromIsoDate: string, toIsoDate: string): number {
  const a = Date.parse(`${fromIsoDate}T00:00:00Z`);
  const b = Date.parse(`${toIsoDate}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 9999;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function doesFeeReminderTriggerMatch(
  rule: Pick<
    FeeReminderRuleRecord,
    | "triggerType"
    | "offsetDays"
    | "dayOfMonth"
    | "specificDate"
    | "rangeStartDay"
    | "rangeEndDay"
    | "active"
    | "expiresAt"
  >,
  nowParts: DatePartsInTz,
  studentDueDateIso: string
): boolean {
  if (!rule.active) return false;
  if (rule.expiresAt && nowParts.isoDate > rule.expiresAt.slice(0, 10)) {
    return false;
  }

  switch (rule.triggerType) {
    case "before_due_date": {
      const offset = Math.max(1, rule.offsetDays ?? 5);
      const daysUntilDue = diffDaysUtc(nowParts.isoDate, studentDueDateIso);
      return daysUntilDue >= 0 && daysUntilDue <= offset;
    }
    case "on_due_date": {
      return nowParts.isoDate === studentDueDateIso;
    }
    case "after_due_date": {
      const offset = Math.max(0, rule.offsetDays ?? 1);
      const daysPastDue = diffDaysUtc(studentDueDateIso, nowParts.isoDate);
      return daysPastDue >= offset;
    }
    case "specific_calendar_date": {
      return Boolean(rule.specificDate && nowParts.isoDate === rule.specificDate);
    }
    case "specific_day_of_month":
    case "monthly_recurring": {
      const targetDay = rule.dayOfMonth ?? 5;
      return nowParts.day === targetDay;
    }
    case "between_dates": {
      const start = Math.min(rule.rangeStartDay ?? 5, rule.rangeEndDay ?? 10);
      const end = Math.max(rule.rangeStartDay ?? 5, rule.rangeEndDay ?? 10);
      return nowParts.day >= start && nowParts.day <= end;
    }
    default:
      return false;
  }
}

export function doesStudentMatchRuleTargets(
  rule: Pick<
    FeeReminderRuleRecord,
    "targetAudience" | "courseIds" | "batchIds" | "feeStatusFilters" | "targetLogic"
  >,
  student: Pick<StudentRecord, "courseId" | "batchId">,
  breakdown: Pick<
    MonthlyDueBreakdown,
    "overduePaise" | "dueThisMonthPaise" | "upcomingPaise"
  >,
  totalPendingPaise: number
): boolean {
  if (totalPendingPaise <= 0) return false;

  let audienceMatch = true;
  if (rule.targetAudience === "specific_courses") {
    audienceMatch = Boolean(
      student.courseId && rule.courseIds.includes(student.courseId)
    );
  } else if (rule.targetAudience === "specific_batches") {
    audienceMatch = Boolean(student.batchId && rule.batchIds.includes(student.batchId));
  }

  const filters =
    rule.feeStatusFilters.length > 0 ? rule.feeStatusFilters : (["pending"] as const);

  const feeMatch = filters.some((f) => {
    if (f === "any" || f === "pending") return totalPendingPaise > 0;
    if (f === "overdue") return breakdown.overduePaise > 0;
    if (f === "upcoming") return breakdown.upcomingPaise > 0;
    return false;
  });

  return rule.targetLogic === "OR"
    ? audienceMatch || feeMatch
    : audienceMatch && feeMatch;
}

export function renderFeeReminderTemplate(
  template: string,
  vars: {
    studentName: string;
    instituteName: string;
    courseName: string;
    pendingAmountRupees: string;
    dueDate: string;
    paidAmountRupees: string;
    month: string;
  }
): string {
  return template
    .replace(/\{student_name\}/gi, vars.studentName)
    .replace(/\{institute_name\}/gi, vars.instituteName)
    .replace(/\{course_name\}/gi, vars.courseName)
    .replace(/\{pending_amount\}/gi, vars.pendingAmountRupees)
    .replace(/\{due_date\}/gi, vars.dueDate)
    .replace(/\{paid_amount\}/gi, vars.paidAmountRupees)
    .replace(/\{month\}/gi, vars.month);
}

function resolveStudentFeeContext(
  plan: StudentFeePlanRecord | undefined,
  nowDate: Date,
  nowParts: DatePartsInTz
) {
  if (!plan) {
    return {
      totalPendingPaise: 0,
      paidPaise: 0,
      dueDateIso: `${nowParts.monthKey}-10`,
      monthLabel: nowParts.monthLabel,
      breakdown: {
        courseFeePaise: 0,
        admissionFeePaise: 0,
        overduePaise: 0,
        dueThisMonthPaise: 0,
        upcomingPaise: 0,
        overallStatus: "PAID" as const,
        installments: [],
      },
    };
  }
  const breakdown = computeMonthlyDueBreakdown(plan, nowDate);
  const nextUnpaid = breakdown.installments.find((i) => i.pendingPaise > 0);
  const dueDateIso = nextUnpaid?.dueDate ?? `${nowParts.monthKey}-10`;
  return {
    totalPendingPaise: Math.max(0, plan.pendingPaise),
    paidPaise: Math.max(0, plan.paidPaise),
    dueDateIso,
    monthLabel: nextUnpaid?.label ?? nowParts.monthLabel,
    breakdown,
  };
}

// ─── CRUD & DASHBOARD ─────────────────────────────────────────────────────────

export async function listFeeReminderRulesAndDashboard(actor: SessionUser): Promise<{
  rules: FeeReminderRuleRecord[];
  dashboard: FeeReminderDashboardSummary;
}> {
  if (!hasStaffPermission(actor, "fees:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);

  const [rulesSnap, deliveriesSnap, plansSnap] = await Promise.all([
    feeReminderRulesCol().where("instituteId", "==", institute.id).get(),
    feeReminderDeliveriesCol().where("instituteId", "==", institute.id).get(),
    feePlansCol().where("instituteId", "==", institute.id).get(),
  ]);

  const rules = rulesSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const deliveries = deliveriesSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const now = new Date();
  let overdueStudentsCount = 0;
  for (const pDoc of plansSnap.docs) {
    const plan = pDoc.data();
    if (plan.pendingPaise > 0) {
      const bd = computeMonthlyDueBreakdown(plan, now);
      if (bd.overduePaise > 0) overdueStudentsCount += 1;
    }
  }

  const readCount = deliveries.filter(
    (d) => d.status === "read" || d.status === "dismissed"
  ).length;
  const unreadCount = deliveries.filter(
    (d) => d.status === "delivered" || d.status === "snoozed"
  ).length;

  const perfMap = new Map<string, FeeReminderRulePerformance>();
  for (const r of rules) {
    perfMap.set(r.id, {
      ruleId: r.id,
      ruleName: r.name,
      generatedCount: 0,
      readCount: 0,
      unreadCount: 0,
      resolvedPaidCount: 0,
    });
  }
  for (const d of deliveries) {
    const row = perfMap.get(d.ruleId) ?? {
      ruleId: d.ruleId,
      ruleName: d.ruleName,
      generatedCount: 0,
      readCount: 0,
      unreadCount: 0,
      resolvedPaidCount: 0,
    };
    row.generatedCount += 1;
    if (d.status === "read" || d.status === "dismissed") row.readCount += 1;
    else if (d.status === "resolved_paid") row.resolvedPaidCount += 1;
    else row.unreadCount += 1;
    perfMap.set(d.ruleId, row);
  }

  return {
    rules,
    dashboard: {
      totalGenerated: deliveries.length,
      deliveredCount: deliveries.filter((d) => d.status !== "resolved_paid").length,
      readCount,
      unreadCount,
      overdueStudentsCount,
      rulePerformance: Array.from(perfMap.values()),
      recentDeliveries: deliveries.slice(0, 60),
    },
  };
}

export interface CreateFeeReminderRuleInput {
  name: string;
  triggerType: FeeReminderTriggerType;
  offsetDays?: number | undefined;
  dayOfMonth?: number | undefined;
  specificDate?: string | undefined;
  rangeStartDay?: number | undefined;
  rangeEndDay?: number | undefined;
  targetAudience: FeeReminderTargetAudience;
  courseIds?: string[] | undefined;
  batchIds?: string[] | undefined;
  feeStatusFilters: FeeReminderFeeStatus[];
  targetLogic?: FeeReminderTargetLogic | undefined;
  titleTemplate: string;
  messageTemplate: string;
  reminderType: FeeReminderType;
  priority: FeeReminderPriority;
  allowDismiss?: boolean | undefined;
  allowRemindLater?: boolean | undefined;
  remindLaterHours?: number | undefined;
  active?: boolean | undefined;
  expiresAt?: string | null | undefined;
}

export async function createFeeReminderRule(
  actor: SessionUser,
  input: CreateFeeReminderRuleInput
): Promise<FeeReminderRuleRecord> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const now = new Date().toISOString();
  const id = generateId("FRR");

  const rule: FeeReminderRuleRecord = {
    id,
    instituteId: institute.id,
    name: input.name.trim(),
    triggerType: input.triggerType,
    offsetDays: input.offsetDays,
    dayOfMonth: input.dayOfMonth,
    specificDate: input.specificDate,
    rangeStartDay: input.rangeStartDay,
    rangeEndDay: input.rangeEndDay,
    targetAudience: input.targetAudience,
    courseIds: input.courseIds ?? [],
    batchIds: input.batchIds ?? [],
    feeStatusFilters:
      input.feeStatusFilters.length > 0 ? input.feeStatusFilters : ["pending"],
    targetLogic: input.targetLogic ?? "AND",
    titleTemplate: input.titleTemplate.trim(),
    messageTemplate: input.messageTemplate.trim(),
    reminderType: input.reminderType,
    priority: input.priority,
    allowDismiss: input.allowDismiss ?? true,
    allowRemindLater: input.allowRemindLater ?? true,
    remindLaterHours: input.remindLaterHours ?? 24,
    active: input.active ?? true,
    expiresAt: input.expiresAt ?? null,
    timezone: "Asia/Kolkata",
    createdBy: actor.uid,
    createdAt: now,
    updatedAt: now,
  };

  await feeReminderRulesCol().doc(id).set(rule);
  await recordAuditLog({
    action: "FEE_REMINDER_RULE_CREATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: id,
    metadata: { name: rule.name, triggerType: rule.triggerType },
  });

  // Immediately evaluate for eligible students if rule is active
  if (rule.active) {
    await evaluateFeeRemindersForInstitute(institute.id).catch(() => undefined);
  }

  return rule;
}

export async function updateFeeReminderRule(
  actor: SessionUser,
  ruleId: string,
  patch: {
    active?: boolean | undefined;
    name?: string | undefined;
    allowDismiss?: boolean | undefined;
    allowRemindLater?: boolean | undefined;
  }
): Promise<FeeReminderRuleRecord> {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = feeReminderRulesCol().doc(ruleId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "RULE_NOT_FOUND", "Fee reminder rule not found.");
  }

  const next: FeeReminderRuleRecord = {
    ...existing,
    ...(patch.active !== undefined ? { active: patch.active } : {}),
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.allowDismiss !== undefined ? { allowDismiss: patch.allowDismiss } : {}),
    ...(patch.allowRemindLater !== undefined
      ? { allowRemindLater: patch.allowRemindLater }
      : {}),
    updatedAt: new Date().toISOString(),
  };
  await ref.set(next);
  return next;
}

export async function deleteFeeReminderRule(actor: SessionUser, ruleId: string) {
  if (!hasStaffPermission(actor, "fees:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = feeReminderRulesCol().doc(ruleId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "RULE_NOT_FOUND", "Fee reminder rule not found.");
  }
  await ref.delete();
  return { deleted: true, id: ruleId };
}

// ─── EVALUATION & PAYMENT SYNC ENGINE ─────────────────────────────────────────

export async function evaluateFeeRemindersForInstitute(
  instituteId: string,
  onlyStudentId?: string
): Promise<{ generatedCount: number; resolvedPaidCount: number }> {
  const [instSnap, rulesSnap, studentsSnap, plansSnap, deliveriesSnap] =
    await Promise.all([
      institutesCollection().doc(instituteId).get(),
      feeReminderRulesCol().where("instituteId", "==", instituteId).get(),
      onlyStudentId
        ? studentsCollection().doc(onlyStudentId).get()
        : studentsCollection().where("instituteId", "==", instituteId).get(),
      onlyStudentId
        ? feePlansCol().where("studentId", "==", onlyStudentId).get()
        : feePlansCol().where("instituteId", "==", instituteId).get(),
      onlyStudentId
        ? feeReminderDeliveriesCol().where("studentId", "==", onlyStudentId).get()
        : feeReminderDeliveriesCol().where("instituteId", "==", instituteId).get(),
    ]);

  const institute = instSnap.data();
  if (!institute) return { generatedCount: 0, resolvedPaidCount: 0 };

  const activeRules = rulesSnap.docs.map((d) => d.data()).filter((r) => r.active);
  const studentsList: StudentRecord[] =
    "docs" in studentsSnap
      ? studentsSnap.docs.map((d) => d.data()).filter((s) => s.status === "active")
      : studentsSnap.exists && studentsSnap.data()?.status === "active"
        ? [studentsSnap.data()!]
        : [];

  const planByStudentId = new Map<string, StudentFeePlanRecord>();
  for (const pDoc of plansSnap.docs) {
    const plan = pDoc.data();
    if (plan.instituteId === instituteId) {
      planByStudentId.set(plan.studentId, plan);
    }
  }

  const existingDeliveries = new Map<string, FeeReminderDeliveryRecord>();
  for (const dDoc of deliveriesSnap.docs) {
    const del = dDoc.data();
    if (del.instituteId === instituteId) {
      existingDeliveries.set(del.id, del);
    }
  }

  const nowDate = new Date();
  const nowIso = nowDate.toISOString();
  const db = getAdminFirestore();
  const batch = db.batch();
  let ops = 0;
  let generatedCount = 0;
  let resolvedPaidCount = 0;

  // 1. Resolve paid-in-full students & update partial payments on open deliveries
  for (const student of studentsList) {
    const plan = planByStudentId.get(student.id);
    const pendingPaise = Math.max(0, plan?.pendingPaise ?? 0);
    const paidPaise = Math.max(0, plan?.paidPaise ?? 0);

    for (const del of existingDeliveries.values()) {
      if (del.studentId !== student.id || del.status === "resolved_paid") continue;
      if (pendingPaise <= 0) {
        batch.update(feeReminderDeliveriesCol().doc(del.id), {
          status: "resolved_paid",
          pendingAmountPaise: 0,
          paidAmountPaise: paidPaise,
          resolvedAt: nowIso,
          updatedAt: nowIso,
        });
        resolvedPaidCount += 1;
        ops += 1;
      } else if (del.pendingAmountPaise !== pendingPaise) {
        const rule = activeRules.find((r) => r.id === del.ruleId);
        const nextTitle = rule
          ? renderFeeReminderTemplate(rule.titleTemplate, {
              studentName: student.fullName,
              instituteName: institute.name,
              courseName: student.courseName,
              pendingAmountRupees: (pendingPaise / 100).toFixed(0),
              dueDate: del.dueDate,
              paidAmountRupees: (paidPaise / 100).toFixed(0),
              month: del.monthLabel,
            })
          : del.title;
        const nextMsg = rule
          ? renderFeeReminderTemplate(rule.messageTemplate, {
              studentName: student.fullName,
              instituteName: institute.name,
              courseName: student.courseName,
              pendingAmountRupees: (pendingPaise / 100).toFixed(0),
              dueDate: del.dueDate,
              paidAmountRupees: (paidPaise / 100).toFixed(0),
              month: del.monthLabel,
            })
          : del.message;
        batch.update(feeReminderDeliveriesCol().doc(del.id), {
          pendingAmountPaise: pendingPaise,
          paidAmountPaise: paidPaise,
          title: nextTitle,
          message: nextMsg,
          updatedAt: nowIso,
        });
        ops += 1;
      }
    }
  }

  // 2. Evaluate active rules against eligible students
  for (const rule of activeRules) {
    const nowParts = getDatePartsInTimezone(nowDate, rule.timezone || "Asia/Kolkata");
    const periodKey =
      rule.triggerType === "specific_calendar_date" && rule.specificDate
        ? rule.specificDate
        : nowParts.monthKey;

    for (const student of studentsList) {
      const plan = planByStudentId.get(student.id);
      const ctx = resolveStudentFeeContext(plan, nowDate, nowParts);
      if (ctx.totalPendingPaise <= 0) continue;

      if (
        !doesStudentMatchRuleTargets(rule, student, ctx.breakdown, ctx.totalPendingPaise)
      ) {
        continue;
      }
      if (!doesFeeReminderTriggerMatch(rule, nowParts, ctx.dueDateIso)) {
        continue;
      }

      const deliveryId = `${instituteId}_${rule.id}_${student.id}_${periodKey}`;
      if (existingDeliveries.has(deliveryId)) {
        continue; // Prevent duplicate reminders for same rule & period
      }

      const vars = {
        studentName: student.fullName,
        instituteName: institute.name,
        courseName: student.courseName,
        pendingAmountRupees: (ctx.totalPendingPaise / 100).toFixed(0),
        dueDate: ctx.dueDateIso,
        paidAmountRupees: (ctx.paidPaise / 100).toFixed(0),
        month: ctx.monthLabel,
      };

      const delivery: FeeReminderDeliveryRecord = {
        id: deliveryId,
        instituteId,
        ruleId: rule.id,
        ruleName: rule.name,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        courseName: student.courseName,
        batchId: student.batchId ?? "",
        periodKey,
        reminderType: rule.reminderType,
        priority: rule.priority,
        title: renderFeeReminderTemplate(rule.titleTemplate, vars),
        message: renderFeeReminderTemplate(rule.messageTemplate, vars),
        pendingAmountPaise: ctx.totalPendingPaise,
        paidAmountPaise: ctx.paidPaise,
        dueDate: ctx.dueDateIso,
        monthLabel: ctx.monthLabel,
        allowDismiss: rule.allowDismiss,
        allowRemindLater: rule.allowRemindLater,
        remindLaterHours: rule.remindLaterHours,
        status: "delivered",
        snoozedUntil: null,
        deliveredAt: nowIso,
        readAt: null,
        dismissedAt: null,
        resolvedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      batch.set(feeReminderDeliveriesCol().doc(deliveryId), delivery);
      existingDeliveries.set(deliveryId, delivery);
      generatedCount += 1;
      ops += 1;

      if (ops >= 400) break;
    }
    if (ops >= 400) break;
  }

  if (ops > 0) {
    await batch.commit();
  }

  return { generatedCount, resolvedPaidCount };
}

export async function syncStudentFeeRemindersAfterPayment(
  instituteId: string,
  studentId: string
): Promise<void> {
  await evaluateFeeRemindersForInstitute(instituteId, studentId);
}

export async function listActiveStudentFeeReminders(
  actor: SessionUser
): Promise<FeeReminderDeliveryRecord[]> {
  if (actor.role !== "student" || !actor.studentId || !actor.instituteId) {
    return [];
  }

  // Evaluate pending rules for this student on login/fetch so offline deadlines are caught
  await evaluateFeeRemindersForInstitute(actor.instituteId, actor.studentId).catch(
    () => undefined
  );

  const snap = await feeReminderDeliveriesCol()
    .where("studentId", "==", actor.studentId)
    .get();

  const nowMs = Date.now();
  const priorityOrder: Record<FeeReminderPriority, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  return snap.docs
    .map((d) => d.data())
    .filter((d) => {
      if (d.instituteId !== actor.instituteId) return false;
      if (d.status === "dismissed" || d.status === "resolved_paid") return false;
      if (d.status === "snoozed" && d.snoozedUntil) {
        if (Date.parse(d.snoozedUntil) > nowMs) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export async function actOnStudentFeeReminder(
  actor: SessionUser,
  deliveryId: string,
  action: "mark_read" | "dismiss" | "remind_later"
): Promise<FeeReminderDeliveryRecord> {
  if (actor.role !== "student" || !actor.studentId || !actor.instituteId) {
    throw new AuthError(403, "FORBIDDEN", "Student authentication required.");
  }
  const ref = feeReminderDeliveriesCol().doc(deliveryId);
  const snap = await ref.get();
  const existing = snap.data();
  if (
    !snap.exists ||
    !existing ||
    existing.studentId !== actor.studentId ||
    existing.instituteId !== actor.instituteId
  ) {
    throw new AuthError(404, "REMINDER_NOT_FOUND", "Fee reminder not found.");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  let patch: Partial<FeeReminderDeliveryRecord>;

  if (action === "dismiss") {
    patch = {
      status: "dismissed",
      dismissedAt: nowIso,
      readAt: existing.readAt ?? nowIso,
      updatedAt: nowIso,
    };
  } else if (action === "remind_later") {
    const snoozeMs = (existing.remindLaterHours || 24) * 60 * 60 * 1000;
    patch = {
      status: "snoozed",
      snoozedUntil: new Date(now.getTime() + snoozeMs).toISOString(),
      readAt: existing.readAt ?? nowIso,
      updatedAt: nowIso,
    };
  } else {
    patch = {
      status: existing.status === "delivered" ? "read" : existing.status,
      readAt: existing.readAt ?? nowIso,
      updatedAt: nowIso,
    };
  }

  const updated: FeeReminderDeliveryRecord = {
    ...existing,
    ...patch,
  };
  await ref.set(updated);
  return updated;
}
