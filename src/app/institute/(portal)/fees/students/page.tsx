import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { StudentFeeLedgerClient } from "@/features/finance/components/student-fee-ledger-client";

export default async function InstituteStudentFeeLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const [{ student }, data] = await Promise.all([
    searchParams,
    getInstituteFinanceOverview(user, { range: "all" }),
  ]);

  return (
    <StudentFeeLedgerClient
      plans={data.plans}
      receipts={data.receipts}
      initialStudentId={student}
    />
  );
}
