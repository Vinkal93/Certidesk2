import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { institutesCollection } from "@/lib/firebase/firestore";
import { listBillingInvoicesAndCreditNotes } from "@/services/billing.service";
import { BillingInvoicesClient } from "@/features/super-admin/components/billing-invoices-client";

export const metadata: Metadata = {
  title: "Invoices & Credit Notes",
  robots: { index: false, follow: false },
};

export default async function SuInvoicesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const [{ invoices, creditNotes }, instSnap] = await Promise.all([
    listBillingInvoicesAndCreditNotes(user),
    institutesCollection().limit(150).get(),
  ]);

  const institutes = instSnap.docs.map((d) => ({
    id: d.data().id,
    name: d.data().name,
    code: d.data().code,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Billing Invoices &amp; Credit Notes
        </h1>
        <p className="text-muted-foreground text-sm">
          Sequential tax/billing invoice register kept separate from prepaid wallet
          recharge liabilities.
        </p>
      </div>
      <BillingInvoicesClient
        initialInvoices={invoices}
        initialCreditNotes={creditNotes}
        institutes={institutes}
      />
    </div>
  );
}
