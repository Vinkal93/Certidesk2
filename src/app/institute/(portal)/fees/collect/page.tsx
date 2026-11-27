import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { FeeCollectClient } from "@/features/finance/components/fee-collect-client";

export default async function InstituteFeeCollectPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user);
  return <FeeCollectClient plans={data.plans} accounts={data.accounts} />;
}
