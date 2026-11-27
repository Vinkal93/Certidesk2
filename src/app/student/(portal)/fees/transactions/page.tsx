import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getStudentFeesAndPayments } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentFeeTransactionsPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user || user.role !== "student") redirect("/login/student");

  const { payments } = await getStudentFeesAndPayments(user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Fee Transactions ({payments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border bg-surface text-muted border-b">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Transaction ID</th>
                <th className="px-3 py-2.5 font-semibold">Method</th>
                <th className="px-3 py-2.5 font-semibold">Amount</th>
                <th className="px-3 py-2.5 font-semibold">Reference</th>
                <th className="px-3 py-2.5 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted px-3 py-6 text-center">
                    No fee transactions recorded for your account yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2.5 font-mono">{p.id}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline">{p.paymentMode.toUpperCase()}</Badge>
                    </td>
                    <td className="text-success px-3 py-2.5 font-semibold tabular-nums">
                      ₹{(p.amountPaise / 100).toFixed(2)}
                    </td>
                    <td className="text-muted px-3 py-2.5">
                      {p.receiptNo || p.note || "—"}
                    </td>
                    <td className="text-muted px-3 py-2.5">{p.createdAt.slice(0, 10)}</td>
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
