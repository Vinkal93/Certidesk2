import type { StudentFeePlanRecord } from "@/types/academic";

export type InstallmentStatus = "PAID" | "PARTIAL" | "OVERDUE" | "DUE" | "UPCOMING";

export interface MonthlyInstallmentItem {
  index: number;
  label: string;
  monthKey: string;
  dueDate: string;
  amountPaise: number;
  paidPaise: number;
  pendingPaise: number;
  status: InstallmentStatus;
}

export interface MonthlyDueBreakdown {
  courseFeePaise: number;
  admissionFeePaise: number;
  overduePaise: number;
  dueThisMonthPaise: number;
  upcomingPaise: number;
  overallStatus: InstallmentStatus;
  installments: MonthlyInstallmentItem[];
}

function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonths(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + offset, 1);
}

export function computeMonthlyDueBreakdown(
  plan: StudentFeePlanRecord,
  nowDate = new Date()
): MonthlyDueBreakdown {
  const currentMonthKey = toMonthKey(nowDate);
  const startBase = new Date(plan.startDate || plan.createdAt || nowDate.toISOString());
  const validStart = Number.isNaN(startBase.getTime()) ? nowDate : startBase;

  const months = plan.durationMonths && plan.durationMonths > 0 ? plan.durationMonths : 0;
  const monthly = plan.monthlyFeePaise ?? 0;
  const admission = plan.admissionFeePaise ?? 0;

  const rawItems: Array<{ label: string; monthKey: string; amountPaise: number }> = [];

  if (months > 0 && monthly > 0) {
    if (admission > 0) {
      rawItems.push({
        label: "Admission Fee",
        monthKey: toMonthKey(validStart),
        amountPaise: admission,
      });
    }
    for (let i = 0; i < months; i++) {
      const d = addMonths(validStart, i);
      rawItems.push({
        label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        monthKey: toMonthKey(d),
        amountPaise: monthly,
      });
    }
    const scheduledSum = rawItems.reduce((acc, it) => acc + it.amountPaise, 0);
    if (plan.totalFeePaise > scheduledSum) {
      rawItems.push({
        label: "Additional Fee",
        monthKey: toMonthKey(validStart),
        amountPaise: plan.totalFeePaise - scheduledSum,
      });
    }
  } else {
    rawItems.push({
      label: "Course Fee",
      monthKey: toMonthKey(validStart),
      amountPaise: plan.totalFeePaise,
    });
  }

  let remainingCredit = Math.max(0, plan.paidPaise + plan.discountPaise);
  let overduePaise = 0;
  let dueThisMonthPaise = 0;
  let upcomingPaise = 0;

  const installments: MonthlyInstallmentItem[] = rawItems.map((item, idx) => {
    const applied = Math.min(item.amountPaise, remainingCredit);
    remainingCredit -= applied;
    const pending = Math.max(0, item.amountPaise - applied);

    let status: InstallmentStatus = "PAID";
    if (pending > 0) {
      if (item.monthKey < currentMonthKey) {
        status = applied > 0 ? "PARTIAL" : "OVERDUE";
        overduePaise += pending;
      } else if (item.monthKey === currentMonthKey) {
        status = applied > 0 ? "PARTIAL" : "DUE";
        dueThisMonthPaise += pending;
      } else {
        status = applied > 0 ? "PARTIAL" : "UPCOMING";
        upcomingPaise += pending;
      }
    }

    return {
      index: idx,
      label: item.label,
      monthKey: item.monthKey,
      dueDate: `${item.monthKey}-10`,
      amountPaise: item.amountPaise,
      paidPaise: applied,
      pendingPaise: pending,
      status,
    };
  });

  let overallStatus: InstallmentStatus = "PAID";
  if (overduePaise > 0) overallStatus = "OVERDUE";
  else if (dueThisMonthPaise > 0) overallStatus = "DUE";
  else if (upcomingPaise > 0) overallStatus = "UPCOMING";

  return {
    courseFeePaise: Math.max(0, plan.totalFeePaise - admission),
    admissionFeePaise: admission,
    overduePaise,
    dueThisMonthPaise,
    upcomingPaise,
    overallStatus,
    installments,
  };
}
