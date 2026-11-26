"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WalletTransactionRecord } from "@/types/domain";

interface RazorpayCheckoutInstance {
  open: () => void;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

export function WalletClient({
  instituteName,
  initialBalancePaise,
  initialTransactions,
  canRecharge,
}: {
  instituteName: string;
  initialBalancePaise: number;
  initialTransactions: WalletTransactionRecord[];
  canRecharge: boolean;
}) {
  const router = useRouter();
  const [balancePaise, setBalancePaise] = React.useState(initialBalancePaise);
  const [amountRupees, setAmountRupees] = React.useState("500");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const loadRazorpayScript = async (): Promise<boolean> => {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRecharge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const orderRes = await fetch("/api/institute/wallet/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRupees: Number(amountRupees) }),
      });

      const orderJson = (await orderRes.json()) as
        | {
            ok: true;
            data: {
              orderId: string;
              amountPaise: number;
              currency: string;
              keyId: string;
            };
          }
        | { ok: false; error?: { message?: string } };

      if (!orderRes.ok || !orderJson.ok) {
        setError(
          !orderJson.ok
            ? (orderJson.error?.message ?? "Unable to create payment order.")
            : "Unable to create payment order."
        );
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setError("Failed to load Razorpay Checkout.");
        return;
      }

      const rzp = new window.Razorpay({
        key: orderJson.data.keyId,
        amount: orderJson.data.amountPaise,
        currency: orderJson.data.currency,
        name: "CertiDesk Pro",
        description: `Wallet Recharge — ${instituteName}`,
        order_id: orderJson.data.orderId,
        handler: async (response) => {
          const verifyRes = await fetch("/api/institute/wallet/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyJson = (await verifyRes.json()) as {
            ok: boolean;
            data?: { balanceAfterPaise: number };
            error?: { message?: string };
          };
          if (!verifyRes.ok || !verifyJson.ok || !verifyJson.data) {
            setError(verifyJson.error?.message ?? "Payment verification failed.");
            return;
          }
          setBalancePaise(verifyJson.data.balanceAfterPaise);
          setMessage("Wallet recharged and verified successfully.");
          router.refresh();
        },
      });
      rzp.open();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3.5 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3.5 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="text-primary h-5 w-5" aria-hidden="true" />
              <CardTitle>Institute Wallet</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="border-border bg-surface rounded-xl border p-5">
              <p className="text-muted text-xs font-medium">Available Balance</p>
              <p className="text-foreground mt-1 text-3xl font-bold">
                ₹{(balancePaise / 100).toFixed(2)}
              </p>
            </div>

            {canRecharge && (
              <form onSubmit={handleRecharge} className="space-y-4">
                <Input
                  label="Recharge Amount (₹)"
                  type="number"
                  min="100"
                  max="100000"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  helperText="Minimum ₹100. Credited atomically after server-side signature verification."
                  required
                />
                <Button type="submit" fullWidth loading={loading}>
                  Recharge via Razorpay
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Transaction Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            {initialTransactions.length === 0 ? (
              <p className="text-muted text-sm">No wallet transactions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-border text-muted border-b text-xs font-semibold uppercase">
                      <th className="py-2.5 pr-4">Date</th>
                      <th className="py-2.5 pr-4">Type</th>
                      <th className="py-2.5 pr-4">Reason</th>
                      <th className="py-2.5 pr-4">Amount</th>
                      <th className="py-2.5">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/70 divide-y">
                    {initialTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="text-muted py-2.5 pr-4 font-mono text-xs">
                          {tx.createdAt.slice(0, 10)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={tx.type === "credit" ? "success" : "warning"}>
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="text-foreground py-2.5 pr-4">{tx.reason}</td>
                        <td className="py-2.5 pr-4 font-medium">
                          ₹{(tx.amountPaise / 100).toFixed(2)}
                        </td>
                        <td className="py-2.5 font-medium">
                          ₹{(tx.balanceAfterPaise / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
