import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentFeesAndPayments } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Payment Receipts",
  robots: { index: false, follow: false },
};

export default async function StudentPaymentsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { payments } = await getStudentFeesAndPayments(user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Fee Payment Receipts</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-muted text-sm">No fee payment receipts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border text-muted border-b text-xs uppercase">
                  <th className="py-2 pr-4">Receipt No</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-border/70 divide-y">
                {payments.map((pmt) => (
                  <tr key={pmt.id}>
                    <td className="py-2.5 pr-4 font-mono text-xs font-medium">
                      {pmt.receiptNo}
                    </td>
                    <td className="text-muted py-2.5 pr-4 font-mono text-xs">
                      {pmt.paidAt.slice(0, 10)}
                    </td>
                    <td className="py-2.5 pr-4 text-xs uppercase">{pmt.paymentMode}</td>
                    <td className="py-2.5 pr-4 font-semibold">
                      ₹{(pmt.amountPaise / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5">
                      <Badge variant="success">Paid</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
