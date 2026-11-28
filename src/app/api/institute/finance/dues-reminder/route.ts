import { requireSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { AuthError } from "@/lib/security/session";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { computeMonthlyDueBreakdown } from "@/lib/finance/monthly-dues";
import { sendInstitutePopupMessage } from "@/services/popup-messages.service";

export async function POST() {
  try {
    const actor = await requireSessionUser();
    if (!hasStaffPermission(actor, "fees:write")) {
      throw new AuthError(403, "FORBIDDEN", "Missing fees:write permission.");
    }
    const institute = await resolveAuthorizedInstitute(actor);
    const overview = await getInstituteFinanceOverview(actor);
    const duePlans = overview.plans.filter((p) => p.pendingPaise > 0);

    let sentCount = 0;
    let skippedCount = 0;

    for (const plan of duePlans) {
      const breakdown = computeMonthlyDueBreakdown(plan);
      const immediateDuePaise = breakdown.overduePaise + breakdown.dueThisMonthPaise;
      if (immediateDuePaise <= 0 && plan.pendingPaise <= 0) {
        skippedCount += 1;
        continue;
      }

      const dueRupees = (immediateDuePaise / 100).toFixed(0);
      const overdueRupees = (breakdown.overduePaise / 100).toFixed(0);
      const totalPendingRupees = (plan.pendingPaise / 100).toFixed(0);

      const headlineAmount = immediateDuePaise > 0 ? dueRupees : totalPendingRupees;

      await sendInstitutePopupMessage(actor, {
        targetType: "student",
        studentId: plan.studentId,
        category: "fee_reminder",
        title: `Fee Due Reminder — ₹${headlineAmount}`,
        message:
          immediateDuePaise > 0
            ? `Dear ${plan.studentName}, your current fee due is ₹${dueRupees} (Overdue: ₹${overdueRupees}, Total Pending: ₹${totalPendingRupees}) for ${plan.courseName} at ${institute.name}. Please clear your dues promptly.`
            : `Dear ${plan.studentName}, you have a pending fee balance of ₹${totalPendingRupees} for ${plan.courseName} at ${institute.name}.`,
        ctaLabel: "View & Pay Fees",
        ctaHref: "/student/fees",
      });
      sentCount += 1;
    }

    return jsonOk({ sentCount, skippedCount });
  } catch (error) {
    return handleApiError(error);
  }
}
