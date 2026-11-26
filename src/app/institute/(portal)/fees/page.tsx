import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listInstituteStudents } from "@/services/student.service";
import { listInstituteFees } from "@/services/fee.service";
import { FeesClient } from "@/features/institutes/components/fees-client";

export const metadata: Metadata = {
  title: "Fee Management",
  robots: { index: false, follow: false },
};

export default async function InstituteFeesPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "fees:read")) {
    redirect("/institute/dashboard");
  }

  const [students, feesData] = await Promise.all([
    hasStaffPermission(user, "students:read")
      ? listInstituteStudents(user)
      : Promise.resolve([]),
    listInstituteFees(user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Student Fee Management
        </h2>
        <p className="text-muted text-sm">
          Manage student fee plans, discounts, partial payments, and receipts (separate
          from platform wallet).
        </p>
      </div>
      <FeesClient
        students={students}
        initialPlans={feesData.plans}
        initialPayments={feesData.payments}
        canWrite={hasStaffPermission(user, "fees:write")}
      />
    </div>
  );
}
