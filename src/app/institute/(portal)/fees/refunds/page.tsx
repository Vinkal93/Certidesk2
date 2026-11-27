import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { FeeRefundClient } from "@/features/finance/components/fee-refund-client";

export default async function InstituteFeeRefundsPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await getInstituteFinanceOverview(user);
  return <FeeRefundClient payments={data.payments} refunds={data.refunds} />;
}
