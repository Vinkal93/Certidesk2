import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { computeMonthlyDueBreakdown } from "@/lib/finance/monthly-dues";
import { StatusChip } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SendDuesReminderButton } from "@/features/finance/components/send-dues-reminder-button";

export default async function InstituteFeeDuesPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user);
  const duePlans = data.plans.filter((p) => p.pendingPaise > 0);

  const rows = duePlans.map((p) => ({
    plan: p,
    breakdown: computeMonthlyDueBreakdown(p),
  }));

  const uniqueCourses = new Set(
    rows.map((r) => r.plan.courseName.trim()).filter(Boolean)
  );
  const totalPaidPaise = rows.reduce((s, r) => s + r.plan.paidPaise, 0);
  const totalOverduePaise = rows.reduce((s, r) => s + r.breakdown.overduePaise, 0);
  const totalCurrentDuePaise = rows.reduce(
    (s, r) => s + r.breakdown.dueThisMonthPaise,
    0
  );
  const totalUpcomingPaise = rows.reduce((s, r) => s + r.breakdown.upcomingPaise, 0);
  const totalPendingPaise = rows.reduce((s, r) => s + r.plan.pendingPaise, 0);
  const overdueCount = rows.filter((r) => r.breakdown.overallStatus === "OVERDUE").length;
  const dueCount = rows.filter((r) => r.breakdown.overallStatus === "DUE").length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Pending Fee Dues ({duePlans.length})</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <SendDuesReminderButton dueCount={duePlans.length} />
          <Link
            href="/institute/fees/collect"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Collect Payment
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border bg-surface text-muted border-b">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Student ID</th>
                <th className="px-3 py-2.5 font-semibold">Student</th>
                <th className="px-3 py-2.5 font-semibold">Course</th>
                <th className="px-3 py-2.5 font-semibold">Paid</th>
                <th className="px-3 py-2.5 font-semibold">Overdue</th>
                <th className="px-3 py-2.5 font-semibold">Current Due</th>
                <th className="px-3 py-2.5 font-semibold">Upcoming</th>
                <th className="px-3 py-2.5 font-semibold">Total Pending</th>
                <th className="px-3 py-2.5 font-semibold">State</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-muted px-3 py-6 text-center">
                    All student fee plans are fully paid.
                  </td>
                </tr>
              ) : (
                rows.map(({ plan: p, breakdown }) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2.5 font-mono">{p.studentCode}</td>
                    <td className="px-3 py-2.5 font-medium">{p.studentName}</td>
                    <td className="px-3 py-2.5">{p.courseName}</td>
                    <td className="text-success px-3 py-2.5 tabular-nums">
                      ₹{(p.paidPaise / 100).toFixed(2)}
                    </td>
                    <td className="text-danger px-3 py-2.5 font-semibold tabular-nums">
                      ₹{(breakdown.overduePaise / 100).toFixed(2)}
                    </td>
                    <td className="text-warning px-3 py-2.5 font-semibold tabular-nums">
                      ₹{(breakdown.dueThisMonthPaise / 100).toFixed(2)}
                    </td>
                    <td className="text-muted px-3 py-2.5 tabular-nums">
                      ₹{(breakdown.upcomingPaise / 100).toFixed(2)}
                    </td>
                    <td className="text-foreground px-3 py-2.5 font-bold tabular-nums">
                      ₹{(p.pendingPaise / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusChip status={breakdown.overallStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot className="border-border bg-surface/80 border-t-2 font-semibold">
                <tr>
                  <td className="text-foreground px-3 py-3">Total</td>
                  <td className="text-foreground px-3 py-3 tabular-nums">
                    {rows.length} Student{rows.length === 1 ? "" : "s"}
                  </td>
                  <td className="text-muted px-3 py-3 tabular-nums">
                    {uniqueCourses.size} Course{uniqueCourses.size === 1 ? "" : "s"}
                  </td>
                  <td className="text-success px-3 py-3 tabular-nums">
                    ₹{(totalPaidPaise / 100).toFixed(2)}
                  </td>
                  <td className="text-danger px-3 py-3 tabular-nums">
                    ₹{(totalOverduePaise / 100).toFixed(2)}
                  </td>
                  <td className="text-warning px-3 py-3 tabular-nums">
                    ₹{(totalCurrentDuePaise / 100).toFixed(2)}
                  </td>
                  <td className="text-muted px-3 py-3 tabular-nums">
                    ₹{(totalUpcomingPaise / 100).toFixed(2)}
                  </td>
                  <td className="text-foreground px-3 py-3 font-bold tabular-nums">
                    ₹{(totalPendingPaise / 100).toFixed(2)}
                  </td>
                  <td className="text-muted px-3 py-3 text-[11px] tabular-nums">
                    {overdueCount} Overdue · {dueCount} Due
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
