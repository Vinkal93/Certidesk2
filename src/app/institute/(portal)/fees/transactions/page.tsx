import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { FeeTransactionsClient } from "@/features/finance/components/fee-transactions-client";

export default async function InstituteFeeTransactionsPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user, { range: "all" });
  return <FeeTransactionsClient initialPayments={data.payments} />;
}
