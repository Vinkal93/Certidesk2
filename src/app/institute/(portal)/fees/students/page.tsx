import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InstituteStudentFeeLedgerPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Fee Ledger ({data.plans.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border bg-surface text-muted border-b">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Student ID</th>
                <th className="px-3 py-2.5 font-semibold">Student</th>
                <th className="px-3 py-2.5 font-semibold">Course</th>
                <th className="px-3 py-2.5 font-semibold">Total Fee</th>
                <th className="px-3 py-2.5 font-semibold">Discount</th>
                <th className="px-3 py-2.5 font-semibold">Paid</th>
                <th className="px-3 py-2.5 font-semibold">Outstanding</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {data.plans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted px-3 py-6 text-center">
                    No student fee plans created yet.
                  </td>
                </tr>
              ) : (
                data.plans.map((p) => {
                  const status =
                    p.pendingPaise <= 0
                      ? "Paid"
                      : p.paidPaise > 0
                        ? "Partial"
                        : "Pending";
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-2.5 font-mono">{p.studentCode}</td>
                      <td className="px-3 py-2.5 font-medium">{p.studentName}</td>
                      <td className="px-3 py-2.5">{p.courseName}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        ₹{(p.totalFeePaise / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        ₹{(p.discountPaise / 100).toFixed(2)}
                      </td>
                      <td className="text-success px-3 py-2.5 font-semibold tabular-nums">
                        ₹{(p.paidPaise / 100).toFixed(2)}
                      </td>
                      <td className="text-danger px-3 py-2.5 font-semibold tabular-nums">
                        ₹{(p.pendingPaise / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={
                            status === "Paid"
                              ? "success"
                              : status === "Partial"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
