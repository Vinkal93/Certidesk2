import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { walletTransactionsCollection } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Platform Ledger",
  robots: { index: false, follow: false },
};

export default async function SuTransactionsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const snap = await walletTransactionsCollection()
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const txns = snap.docs.map((d) => d.data());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Wallet Ledger</h1>
        <p className="text-muted-foreground text-sm">
          Append-only atomic wallet credit and debit transactions across all institutes.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Ledger Entries ({txns.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {txns.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No ledger transactions recorded yet.
            </p>
          ) : (
            txns.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <span className="font-mono text-xs">{t.id}</span> •{" "}
                  <span>{t.instituteId}</span> •{" "}
                  <span className="text-muted-foreground">{t.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.type === "credit" ? "success" : "primary"}>
                    {t.type}
                  </Badge>
                  <span className="font-semibold">
                    ₹{(t.amountPaise / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
