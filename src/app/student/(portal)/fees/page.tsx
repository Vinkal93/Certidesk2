import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentFeesAndPayments } from "@/services/student-portal.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Fee Summary",
  robots: { index: false, follow: false },
};

export default async function StudentFeesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { plans } = await getStudentFeesAndPayments(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted text-sm">
          Your institute-managed tuition fee plans and pending balances.
        </p>
        <Link
          href="/student/payments"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          View Receipts
        </Link>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="text-muted py-10 text-center text-sm">
            No fee plans assigned to your enrollment yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((p) => (
            <Card key={p.id}>
              <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
                <CardTitle className="text-base">{p.courseName}</CardTitle>
                <Badge variant={p.pendingPaise === 0 ? "success" : "warning"}>
                  {p.pendingPaise === 0 ? "Fully Paid" : "Balance Pending"}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 pt-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-muted text-xs">Total Fee</p>
                  <p className="font-semibold">₹{(p.totalFeePaise / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Discount</p>
                  <p className="font-semibold">₹{(p.discountPaise / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Amount Paid</p>
                  <p className="text-success font-semibold">
                    ₹{(p.paidPaise / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">Pending Balance</p>
                  <p className="text-warning font-semibold">
                    ₹{(p.pendingPaise / 100).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
