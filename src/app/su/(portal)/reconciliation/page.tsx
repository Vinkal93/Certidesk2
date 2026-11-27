import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import {
  paymentOrdersCollection,
  walletTransactionsCollection,
  webhookEventsCollection,
} from "@/lib/firebase/firestore";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Payment Reconciliation",
  robots: { index: false, follow: false },
};

export default async function SuperAdminReconciliationPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const [ordersSnap, txSnap, webhookSnap] = await Promise.all([
    paymentOrdersCollection().get(),
    walletTransactionsCollection().get(),
    webhookEventsCollection().get(),
  ]);

  const orders = ordersSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);

  const txIds = new Set(txSnap.docs.map((d) => d.id));

  const capturedOrders = orders.filter((o) => o.status === "captured");
  const matchedOrders = capturedOrders.filter(
    (o) => o.razorpayPaymentId && txIds.has(`RZP_${o.razorpayPaymentId}`)
  );
  const unmatchedCaptured = capturedOrders.filter(
    (o) => !o.razorpayPaymentId || !txIds.has(`RZP_${o.razorpayPaymentId}`)
  );

  return (
    <PageContainer>
      <Section spacing="sm" background="surface">
        <Container>
          <div className="border-border mb-6 border-b pb-5">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              Payment &amp; Wallet Ledger Reconciliation
            </h1>
            <p className="text-muted mt-1 text-sm">
              Cross-checks captured Razorpay orders against idempotent wallet ledger
              credits and webhook confirmations.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-muted text-xs">Recent Orders</p>
                <p className="mt-1 font-mono text-xl font-bold">{orders.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-muted text-xs">Captured &amp; Reconciled</p>
                <p className="text-success mt-1 font-mono text-xl font-bold">
                  {matchedOrders.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-muted text-xs">Unmatched Captured</p>
                <p
                  className={`mt-1 font-mono text-xl font-bold ${
                    unmatchedCaptured.length > 0 ? "text-danger" : "text-foreground"
                  }`}
                >
                  {unmatchedCaptured.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-muted text-xs">Webhook Events</p>
                <p className="mt-1 font-mono text-xl font-bold">{webhookSnap.size}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order ↔ Ledger Reconciliation Matrix</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <p className="text-muted p-6 text-sm">No payment orders recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-border bg-surface text-muted border-b">
                      <tr>
                        <th className="px-4 py-2.5">Order / Receipt</th>
                        <th className="px-4 py-2.5">Institute</th>
                        <th className="px-4 py-2.5">Paid + Bonus</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Webhook</th>
                        <th className="px-4 py-2.5">Ledger Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {orders.map((ord) => {
                        const hasLedger =
                          ord.razorpayPaymentId &&
                          txIds.has(`RZP_${ord.razorpayPaymentId}`);
                        return (
                          <tr key={ord.orderId}>
                            <td className="px-4 py-2.5 font-mono">
                              <p className="font-semibold">{ord.orderId}</p>
                              <p className="text-muted">{ord.receiptNumber || "—"}</p>
                            </td>
                            <td className="px-4 py-2.5 font-mono">{ord.instituteId}</td>
                            <td className="px-4 py-2.5 font-mono">
                              ₹{(ord.amountPaise / 100).toFixed(2)}
                              {(ord.bonusPaise ?? 0) > 0
                                ? ` + ₹${((ord.bonusPaise ?? 0) / 100).toFixed(2)}`
                                : ""}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant={
                                  ord.status === "captured"
                                    ? "success"
                                    : ord.status === "failed"
                                      ? "danger"
                                      : "outline"
                                }
                              >
                                {ord.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5">
                              {ord.webhookConfirmed ? "Confirmed" : "Pending"}
                            </td>
                            <td className="px-4 py-2.5">
                              {ord.status === "captured" ? (
                                hasLedger ? (
                                  <Badge variant="success">Matched</Badge>
                                ) : (
                                  <Badge variant="danger">Mismatch</Badge>
                                )
                              ) : (
                                <span className="text-muted">N/A</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </Container>
      </Section>
    </PageContainer>
  );
}
