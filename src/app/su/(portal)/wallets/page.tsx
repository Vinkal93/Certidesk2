import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listWalletsAndLedger } from "@/services/su-platform.service";
import { SuWalletsClient } from "@/features/super-admin/components/wallets-client";

export const metadata: Metadata = {
  title: "Wallet Management",
  robots: { index: false, follow: false },
};

export default async function SuWalletsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const data = await listWalletsAndLedger(user);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Wallet Management &amp; Ledger
        </h2>
        <p className="text-muted text-sm">
          Inspect institute balances, credit/debit ledger entries, and execute audited
          atomic adjustments.
        </p>
      </div>
      <SuWalletsClient
        initialInstitutes={data.institutes}
        initialTransactions={data.transactions}
      />
    </div>
  );
}
