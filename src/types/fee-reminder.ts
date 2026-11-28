export type FeeReminderTriggerType =
  | "before_due_date"
  | "on_due_date"
  | "after_due_date"
  | "specific_calendar_date"
  | "specific_day_of_month"
  | "between_dates"
  | "monthly_recurring";

export type FeeReminderFeeStatus = "any" | "pending" | "overdue" | "upcoming";
export type FeeReminderType = "upcoming" | "due" | "overdue";
export type FeeReminderPriority = "low" | "normal" | "high" | "urgent";
export type FeeReminderTargetAudience =
  "all_students" | "specific_courses" | "specific_batches";
export type FeeReminderTargetLogic = "AND" | "OR";

export interface FeeReminderRuleRecord {
  id: string;
  instituteId: string;
  name: string;
  triggerType: FeeReminderTriggerType;
  offsetDays?: number | undefined;
  dayOfMonth?: number | undefined;
  specificDate?: string | undefined;
  rangeStartDay?: number | undefined;
  rangeEndDay?: number | undefined;
  targetAudience: FeeReminderTargetAudience;
  courseIds: string[];
  batchIds: string[];
  feeStatusFilters: FeeReminderFeeStatus[];
  targetLogic: FeeReminderTargetLogic;
  titleTemplate: string;
  messageTemplate: string;
  reminderType: FeeReminderType;
  priority: FeeReminderPriority;
  displayDate?: string | undefined;
  allowDismiss: boolean;
  allowRemindLater: boolean;
  remindLaterHours: number;
  active: boolean;
  expiresAt?: string | null | undefined;
  timezone: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type FeeReminderDeliveryStatus =
  "delivered" | "read" | "dismissed" | "snoozed" | "resolved_paid";

export interface FeeReminderDeliveryRecord {
  id: string;
  instituteId: string;
  ruleId: string;
  ruleName: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  courseName: string;
  batchId: string;
  periodKey: string;
  reminderType: FeeReminderType;
  priority: FeeReminderPriority;
  title: string;
  message: string;
  pendingAmountPaise: number;
  paidAmountPaise: number;
  dueDate: string;
  monthLabel: string;
  allowDismiss: boolean;
  allowRemindLater: boolean;
  remindLaterHours: number;
  status: FeeReminderDeliveryStatus;
  snoozedUntil?: string | null | undefined;
  deliveredAt: string;
  readAt?: string | null | undefined;
  dismissedAt?: string | null | undefined;
  resolvedAt?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface FeeReminderRulePerformance {
  ruleId: string;
  ruleName: string;
  generatedCount: number;
  readCount: number;
  unreadCount: number;
  resolvedPaidCount: number;
}

export interface FeeReminderDashboardSummary {
  totalGenerated: number;
  deliveredCount: number;
  readCount: number;
  unreadCount: number;
  overdueStudentsCount: number;
  rulePerformance: FeeReminderRulePerformance[];
  recentDeliveries: FeeReminderDeliveryRecord[];
}
