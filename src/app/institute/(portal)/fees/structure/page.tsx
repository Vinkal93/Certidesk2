import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { listFeeStructures } from "@/services/institute-finance.service";
import { FeeStructureClient } from "@/features/finance/components/fee-structure-client";

export default async function InstituteFeeStructurePage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const structures = await listFeeStructures(user);
  return <FeeStructureClient structures={structures} />;
}
