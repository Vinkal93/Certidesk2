"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gift,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  InstituteWalletSummary,
  RechargePlanRecord,
  WalletTransactionRecord,
} from "@/types/domain";
import type { PaymentOrderRecord } from "@/types/payment";

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
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

export function WalletClient({
  instituteName,
  initialWallet,
  initialTotals,
  initialTransactions,
  initialOrders,
  rechargePlans,
  admissionFeePaise,
  canRecharge,
  redirectAfterRecharge,
  mode = "full",
}: {
  instituteName: string;
  initialWallet: InstituteWalletSummary;
  initialTotals: {
    totalRechargedPaise: number;
    totalBonusGrantedPaise: number;
    totalConsumedPaise: number;
  };
  initialTransactions: WalletTransactionRecord[];
  initialOrders: PaymentOrderRecord[];
  rechargePlans: RechargePlanRecord[];
  admissionFeePaise: number;
  canRecharge: boolean;
  redirectAfterRecharge?: string;
  mode?: "full" | "recharge_only" | "transactions_only";
}) {
  const router = useRouter();
  const [wallet, setWallet] = React.useState(initialWallet);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>(
    rechargePlans.find((p) => p.promoEligible)?.id ?? rechargePlans[0]?.id ?? "plan_2000"
  );
  const [loadingPlanId, setLoadingPlanId] = React.useState<string | null>(null);
  const [paymentState, setPaymentState] = React.useState<
    "idle" | "pending" | "success" | "failed"
  >("idle");
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

  const handlePlanRecharge = async (plan: RechargePlanRecord) => {
    setError(null);
    setMessage(null);
    setPaymentState("pending");
    setLoadingPlanId(plan.id);

    try {
      const orderRes = await fetch("/api/institute/wallet/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const orderJson = (await orderRes.json()) as
        | {
            ok: true;
            data: {
              orderId: string;
              amountPaise: number;
              bonusPaise: number;
              currency: string;
              keyId: string;
            };
          }
        | { ok: false; error?: { message?: string } };

      if (!orderRes.ok || !orderJson.ok) {
        setPaymentState("failed");
        setError(
          !orderJson.ok
            ? (orderJson.error?.message ?? "Unable to create payment order.")
            : "Unable to create payment order."
        );
        setLoadingPlanId(null);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setPaymentState("failed");
        setError("Failed to load Razorpay Checkout.");
        setLoadingPlanId(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderJson.data.keyId,
        amount: orderJson.data.amountPaise,
        currency: orderJson.data.currency,
        name: "CertiDesk Pro",
        description: `${plan.title} — ${instituteName}`,
        order_id: orderJson.data.orderId,
        modal: {
          ondismiss: () => {
            setPaymentState("idle");
            setLoadingPlanId(null);
          },
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/institute/wallet/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyJson = (await verifyRes.json()) as
              | {
                  ok: true;
                  data: {
                    balanceAfterPaise: number;
                    paidBalanceAfterPaise?: number;
                    bonusBalanceAfterPaise?: number;
                    status: string;
                  };
                }
              | { ok: false; error?: { message?: string } };

            if (!verifyRes.ok || !verifyJson.ok) {
              setPaymentState("failed");
              setError(
                !verifyJson.ok
                  ? (verifyJson.error?.message ??
                      "Payment verification pending or failed. Wallet is credited only after capture.")
                  : "Payment verification failed."
              );
              return;
            }

            setPaymentState("success");
            setWallet((prev) => ({
              ...prev,
              totalSpendableBalancePaise: verifyJson.data.balanceAfterPaise,
              paidBalancePaise:
                verifyJson.data.paidBalanceAfterPaise ?? prev.paidBalancePaise,
              bonusBalancePaise:
                verifyJson.data.bonusBalanceAfterPaise ?? prev.bonusBalancePaise,
            }));
            setMessage(
              `Payment verified! Total spendable balance is now ₹${(
                verifyJson.data.balanceAfterPaise / 100
              ).toFixed(2)}.`
            );
            router.refresh();
            if (redirectAfterRecharge) {
              router.push(redirectAfterRecharge);
            }
          } finally {
            setLoadingPlanId(null);
          }
        },
      });

      rzp.open();
    } catch {
      setPaymentState("failed");
      setError("Failed to initiate Razorpay Checkout.");
      setLoadingPlanId(null);
    }
  };

  const lowBalance = wallet.totalSpendableBalancePaise < admissionFeePaise;

  return (
    <div className="space-y-6">
      {lowBalance && (
        <div
          role="alert"
          className="bg-warning-soft flex flex-col justify-between gap-3 rounded-xl border border-amber-200 p-4 text-sm text-amber-950 sm:flex-row sm:items-center dark:border-amber-800/60 dark:text-amber-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">Low Wallet Balance</p>
              <p className="text-xs text-amber-800 dark:text-amber-300/90">
                Available spendable balance (₹
                {(wallet.totalSpendableBalancePaise / 100).toFixed(2)}) is below the
                student admission charge (₹{(admissionFeePaise / 100).toFixed(2)}).
                Recharge to admit students.
              </p>
            </div>
          </div>
          {mode !== "recharge_only" && canRecharge && (
            <Link
              href="/institute/wallet/recharge"
              className="inline-flex shrink-0 items-center rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Recharge Now
            </Link>
          )}
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card elevated>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Total Spendable</p>
            <p className="text-foreground mt-1 font-mono text-2xl font-bold">
              ₹{(wallet.totalSpendableBalancePaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Paid Credit</p>
            <p className="text-foreground mt-1 font-mono text-xl font-bold">
              ₹{(wallet.paidBalancePaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted flex items-center gap-1 text-xs font-medium">
              <Gift className="text-primary h-3.5 w-3.5" aria-hidden="true" />
              Promotional Credit
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-700">
              ₹{(wallet.bonusBalancePaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Total Recharged</p>
            <p className="text-foreground mt-1 font-mono text-xl font-semibold">
              ₹{(initialTotals.totalRechargedPaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs font-medium">Total Consumed</p>
            <p className="text-foreground mt-1 font-mono text-xl font-semibold">
              ₹{(initialTotals.totalConsumedPaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3.5 text-sm dark:border-red-800/60"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {paymentState === "pending" && !error && (
        <div className="bg-primary-soft text-primary flex items-start gap-2 rounded-lg border border-blue-200 p-3.5 text-sm dark:border-blue-800/60">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Payment checkout is in progress. Wallet balance updates only after server-side
            Razorpay capture verification.
          </span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3.5 text-sm dark:border-emerald-800/60">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {/* Recharge Catalog Cards */}
      {mode !== "transactions_only" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="text-primary h-4 w-4" aria-hidden="true" />
                Select a Recharge Pack
              </CardTitle>
              <p className="text-muted mt-1 text-xs">
                Promotional credits are spent first by default. Server-verified via
                Razorpay.
              </p>
            </div>
            {!canRecharge && (
              <Badge variant="outline">Institute Admin Required to Pay</Badge>
            )}
          </CardHeader>
          <CardContent>
            {rechargePlans.length === 0 ? (
              <p className="text-muted text-sm">
                No recharge plans are currently enabled by Platform Administration.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {rechargePlans.map((plan) => {
                  const isPromo = plan.promoEligible && plan.bonusPaise > 0;
                  const isSelected = selectedPlanId === plan.id;
                  const totalCredit = plan.amountPaise + (isPromo ? plan.bonusPaise : 0);

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all ${
                        isPromo
                          ? "border-primary bg-primary-soft shadow-sm"
                          : isSelected
                            ? "border-primary/70 bg-surface shadow-xs"
                            : "border-border bg-background hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-foreground text-sm font-semibold">
                            {plan.title}
                          </span>
                          {isPromo && (
                            <Badge variant="primary">
                              <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                              {plan.promoLabel || "Promo"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-foreground font-mono text-2xl font-bold">
                          ₹{(plan.amountPaise / 100).toLocaleString("en-IN")}
                        </p>
                        <p className="text-muted mt-1 text-xs">{plan.description}</p>
                        <div className="border-border mt-3 space-y-1 border-t pt-3 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted">Paid Credit</span>
                            <span className="font-mono font-medium">
                              ₹{(plan.amountPaise / 100).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted">Promotional Bonus</span>
                            <span className="font-mono font-semibold text-emerald-700">
                              +₹{((isPromo ? plan.bonusPaise : 0) / 100).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Total Spendable</span>
                            <span className="font-mono">
                              ₹{(totalCredit / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        className="mt-4 w-full"
                        variant={isPromo ? "primary" : "outline"}
                        disabled={!canRecharge || loadingPlanId !== null}
                        loading={loadingPlanId === plan.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlanRecharge(plan);
                        }}
                      >
                        Pay ₹{(plan.amountPaise / 100).toLocaleString("en-IN")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recharge History & Receipts */}
      {mode !== "recharge_only" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="text-primary h-4 w-4" aria-hidden="true" />
                Recharge History &amp; Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {initialOrders.length === 0 ? (
                <p className="text-muted p-5 text-sm">No recharge orders yet.</p>
              ) : (
                <div className="divide-border divide-y">
                  {initialOrders.map((ord) => (
                    <div key={ord.orderId} className="space-y-1 px-5 py-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold">
                          {ord.receiptNumber || ord.internalPaymentId}
                        </span>
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
                      </div>
                      <div className="text-muted flex justify-between">
                        <span>
                          Paid ₹{(ord.amountPaise / 100).toFixed(2)}
                          {(ord.bonusPaise ?? 0) > 0
                            ? ` + Bonus ₹${((ord.bonusPaise ?? 0) / 100).toFixed(2)}`
                            : ""}
                        </span>
                        <span>{ord.createdAt.slice(0, 10)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Immutable Wallet Ledger</CardTitle>
              {mode === "full" && (
                <Link
                  href="/institute/wallet/transactions"
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Full Ledger →
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {initialTransactions.length === 0 ? (
                <p className="text-muted p-5 text-sm">
                  No wallet transactions recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-border bg-surface text-muted border-b">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Date</th>
                        <th className="px-4 py-2.5 font-medium">Ledger Type</th>
                        <th className="px-4 py-2.5 font-medium">Bucket</th>
                        <th className="px-4 py-2.5 font-medium">Amount</th>
                        <th className="px-4 py-2.5 font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {initialTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="text-muted px-4 py-2.5 font-mono">
                            {tx.createdAt.slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-foreground font-medium">
                              {tx.ledgerType || tx.reason}
                            </p>
                            <p className="text-muted max-w-[220px] truncate">{tx.note}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline">{tx.bucket ?? "paid"}</Badge>
                          </td>
                          <td className="px-4 py-2.5 font-mono font-semibold">
                            <span
                              className={
                                tx.type === "credit" ? "text-success" : "text-danger"
                              }
                            >
                              {tx.type === "credit" ? "+" : "-"}₹
                              {(tx.amountPaise / 100).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono">
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
      )}
    </div>
  );
}
