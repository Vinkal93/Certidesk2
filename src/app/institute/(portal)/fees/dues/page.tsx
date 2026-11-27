import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function InstituteFeeDuesPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user);
  const duePlans = data.plans.filter((p) => p.pendingPaise > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Pending Fee Dues ({duePlans.length})</CardTitle>
        <Link
          href="/institute/fees/collect"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          Collect Payment
        </Link>
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
                <th className="px-3 py-2.5 font-semibold">Outstanding Due</th>
                <th className="px-3 py-2.5 font-semibold">State</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {duePlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted px-3 py-6 text-center">
                    All student fee plans are fully paid.
                  </td>
                </tr>
              ) : (
                duePlans.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2.5 font-mono">{p.studentCode}</td>
                    <td className="px-3 py-2.5 font-medium">{p.studentName}</td>
                    <td className="px-3 py-2.5">{p.courseName}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      ₹{(p.paidPaise / 100).toFixed(2)}
                    </td>
                    <td className="text-danger px-3 py-2.5 font-bold tabular-nums">
                      ₹{(p.pendingPaise / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={p.paidPaise > 0 ? "warning" : "danger"}>
                        {p.paidPaise > 0 ? "Partial Due" : "Pending"}
                      </Badge>
                    </td>
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
