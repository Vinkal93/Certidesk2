import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { InsightCard } from "@/components/ui/insight-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default async function InstituteFinancialDashboardPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Financial Overview
          </h2>
          <p className="text-muted text-xs">
            Live figures derived from recorded student fee plans, receipts, refunds, and
            account ledgers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/institute/fees/collect"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Collect Fee
          </Link>
          <Link
            href="/institute/accounts/profit-loss"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Operational P&amp;L
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          title="Collection This Month"
          subtitle="Current month"
          value={`₹${(data.monthCollectionPaise / 100).toFixed(2)}`}
          trendTone="positive"
          trendText={`Today: ₹${(data.todayCollectionPaise / 100).toFixed(2)}`}
          sparkline={[12, 18, 15, 24, 30, 28, 36]}
          detailsHref="/institute/fees/transactions"
        />
        <InsightCard
          title="Outstanding Dues"
          subtitle={`${data.partialStudents + data.pendingStudents} students`}
          value={`₹${(data.totalOutstandingPaise / 100).toFixed(2)}`}
          trendTone={data.totalOutstandingPaise > 0 ? "negative" : "neutral"}
          trendText={`Paid students: ${data.paidStudents}`}
          sparkline={data.totalOutstandingPaise > 0 ? [30, 28, 29, 25, 24] : []}
          detailsHref="/institute/fees/dues"
        />
        <InsightCard
          title="Other Income & Expenses"
          subtitle="Non-fee accounts"
          value={`₹${(data.otherIncomePaise / 100).toFixed(2)}`}
          trendTone="neutral"
          trendText={`Expenses: ₹${(data.totalExpensesPaise / 100).toFixed(2)}`}
          detailsHref="/institute/accounts/expenses"
        />
        <InsightCard
          title="Operational Surplus"
          subtitle="Cash-basis summary"
          value={`₹${(data.operationalSurplusPaise / 100).toFixed(2)}`}
          trendTone={data.operationalSurplusPaise >= 0 ? "positive" : "negative"}
          trendText={`Refunds: ₹${(data.totalRefundedPaise / 100).toFixed(2)}`}
          sparkline={[10, 14, 16, 20, 25]}
          detailsHref="/institute/accounts/profit-loss"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {Object.keys(data.methodTotalsPaise).length === 0 ? (
              <p className="text-muted text-xs">No fee payments recorded yet.</p>
            ) : (
              Object.entries(data.methodTotalsPaise).map(([method, paise]) => (
                <div key={method} className="flex items-center justify-between">
                  <Badge variant="outline">{method.toUpperCase()}</Badge>
                  <span className="text-foreground font-semibold tabular-nums">
                    ₹{(paise / 100).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Recent Fee Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.receipts.length === 0 ? (
              <p className="text-muted text-xs">No receipts issued yet.</p>
            ) : (
              <div className="divide-border divide-y text-xs">
                {data.receipts.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-foreground font-semibold">
                        {r.receiptNumber} · {r.studentName}
                      </p>
                      <p className="text-muted">
                        {r.courseName} · {r.paymentMethod.toUpperCase()} ·{" "}
                        {r.issuedAt.slice(0, 10)}
                      </p>
                    </div>
                    <span className="text-success font-bold tabular-nums">
                      +₹{(r.amountPaise / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
