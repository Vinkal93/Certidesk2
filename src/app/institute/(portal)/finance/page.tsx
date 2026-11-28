import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { FinancialDashboardClient } from "@/features/finance/components/financial-dashboard-client";

export default async function InstituteFinancialDashboardPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user, { range: "month" });
  return <FinancialDashboardClient initialData={data} />;
}
