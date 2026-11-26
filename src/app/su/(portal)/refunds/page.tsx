import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { paymentOrdersCollection } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Refunds & Failures",
  robots: { index: false, follow: false },
};

export default async function SuRefundsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const snap = await paymentOrdersCollection()
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const exceptions = snap.docs
    .map((d) => d.data())
    .filter((o) => o.status === "failed" || o.status === "refunded");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Refunds & Failed Payments</h1>
        <p className="text-muted-foreground text-sm">
          Failed or refunded Razorpay orders tracked in Firestore.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Payment Exceptions ({exceptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exceptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No failed or refunded orders recorded.
            </p>
          ) : (
            exceptions.map((o) => (
              <div
                key={o.orderId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <span className="font-mono text-xs">{o.orderId}</span> •{" "}
                  <span>{o.instituteId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="danger">{o.status}</Badge>
                  <span>₹{(o.amountPaise / 100).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
