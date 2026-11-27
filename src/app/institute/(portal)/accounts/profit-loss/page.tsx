import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InstituteAccountsProfitLossPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user);

  const expenseByCategory = new Map<string, number>();
  for (const entry of data.ledgerEntries) {
    if (entry.entryType === "expense" && entry.status === "posted") {
      expenseByCategory.set(
        entry.categoryName,
        (expenseByCategory.get(entry.categoryName) ?? 0) + entry.amountPaise
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-border bg-surface text-muted rounded-xl border p-4 text-xs">
        <strong>Accounting Basis Notice:</strong> This is an operational cash-basis
        financial summary derived from recorded student fee collections, refunds, non-fee
        income, and operating expenses. It is not an audited statutory GAAP/Ind-AS
        statement.
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted text-xs">Net Fee Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-2xl font-bold tabular-nums">
              ₹
              {((data.totalFeesCollectedPaise - data.totalRefundedPaise) / 100).toFixed(
                2
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted text-xs">Other Non-Fee Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-2xl font-bold tabular-nums">
              ₹{(data.otherIncomePaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted text-xs">Operating Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-danger text-2xl font-bold tabular-nums">
              ₹{(data.totalExpensesPaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted text-xs">
              Operational Surplus / Deficit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${
                data.operationalSurplusPaise >= 0 ? "text-success" : "text-danger"
              }`}
            >
              ₹{(data.operationalSurplusPaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseByCategory.size === 0 ? (
            <p className="text-muted text-xs">No expenses recorded yet.</p>
          ) : (
            <div className="divide-border divide-y text-sm">
              {Array.from(expenseByCategory.entries()).map(([cat, paise]) => (
                <div key={cat} className="flex items-center justify-between py-2.5">
                  <span className="text-foreground font-medium">{cat}</span>
                  <span className="text-danger font-semibold tabular-nums">
                    ₹{(paise / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
