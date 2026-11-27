import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InstituteFeeReceiptsPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issued Fee Receipts ({data.receipts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border bg-surface text-muted border-b">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Receipt No</th>
                <th className="px-3 py-2.5 font-semibold">Student</th>
                <th className="px-3 py-2.5 font-semibold">Period</th>
                <th className="px-3 py-2.5 font-semibold">Method</th>
                <th className="px-3 py-2.5 font-semibold">Paid</th>
                <th className="px-3 py-2.5 font-semibold">Remaining</th>
                <th className="px-3 py-2.5 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {data.receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted px-3 py-6 text-center">
                    No receipts issued yet.
                  </td>
                </tr>
              ) : (
                data.receipts.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2.5 font-mono font-semibold">
                      {r.receiptNumber}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.studentName} ({r.studentCode})
                    </td>
                    <td className="px-3 py-2.5">{r.feePeriod}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline">{r.paymentMethod.toUpperCase()}</Badge>
                    </td>
                    <td className="text-success px-3 py-2.5 font-semibold tabular-nums">
                      ₹{(r.amountPaise / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      ₹{(r.remainingDuesPaise / 100).toFixed(2)}
                    </td>
                    <td className="text-muted px-3 py-2.5">{r.issuedAt.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
