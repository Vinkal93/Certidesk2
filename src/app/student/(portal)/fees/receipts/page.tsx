import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getStudentReceipts } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentFeeReceiptsPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user || user.role !== "student") redirect("/login/student");

  const { receipts } = await getStudentReceipts(user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Fee Receipts ({receipts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border bg-surface text-muted border-b">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Receipt No</th>
                <th className="px-3 py-2.5 font-semibold">Course &amp; Period</th>
                <th className="px-3 py-2.5 font-semibold">Method</th>
                <th className="px-3 py-2.5 font-semibold">Amount Paid</th>
                <th className="px-3 py-2.5 font-semibold">Remaining Dues</th>
                <th className="px-3 py-2.5 font-semibold">Issued Date</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted px-3 py-6 text-center">
                    No receipts issued for your account yet.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2.5 font-mono font-semibold">
                      {r.receiptNumber}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.courseName} · {r.feePeriod}
                    </td>
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
