import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { paymentOrdersCollection } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Invoices & Receipts",
  robots: { index: false, follow: false },
};

export default async function SuInvoicesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const snap = await paymentOrdersCollection()
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const captured = snap.docs.map((d) => d.data()).filter((o) => o.status === "captured");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoices & Payment Receipts</h1>
        <p className="text-muted-foreground text-sm">
          Captured Razorpay payment orders recorded in Firestore.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Captured Orders ({captured.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {captured.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No captured payment orders found.
            </p>
          ) : (
            captured.map((o) => (
              <div
                key={o.orderId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <span className="font-mono text-xs font-semibold">{o.orderId}</span> •{" "}
                  <span>{o.instituteId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{o.environment}</Badge>
                  <span className="font-semibold">
                    ₹{(o.amountPaise / 100).toFixed(2)}
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
