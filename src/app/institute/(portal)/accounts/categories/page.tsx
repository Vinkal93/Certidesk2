import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { listFinanceAccountsAndLedger } from "@/services/institute-finance.service";
import { AccountsLedgerClient } from "@/features/finance/components/accounts-ledger-client";

export default async function InstituteAccountsCategoriesPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const data = await listFinanceAccountsAndLedger(user);
  return (
    <AccountsLedgerClient
      mode="categories"
      categories={data.categories}
      accounts={data.accounts}
      entries={data.entries}
    />
  );
}
