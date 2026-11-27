"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const QUICK_PACKS = [
  { amountRupees: 500, label: "₹500", sub: "Starter" },
  { amountRupees: 1000, label: "₹1,000", sub: "Growth" },
  { amountRupees: 2000, label: "₹2,000", sub: "+₹200 Bonus" },
];

export function TopbarWalletButton({
  balancePaise,
  lowBalance,
  onClick,
}: {
  balancePaise: number;
  lowBalance: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open wallet details and recharge"
      className={`border-border hover:bg-surface inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        lowBalance
          ? "bg-amber-50/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          : "bg-background text-foreground"
      }`}
    >
      <Wallet
        className={`h-3.5 w-3.5 ${lowBalance ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}
        aria-hidden="true"
      />
      <span className="tabular-nums">₹{(balancePaise / 100).toFixed(0)}</span>
    </button>
  );
}

export function TopbarWalletModal({
  open,
  onClose,
  institute,
}: {
  open: boolean;
  onClose: () => void;
  institute: {
    id: string;
    name: string;
    code: string;
    walletBalancePaise: number;
    admissionFeePaise: number;
  };
}) {
  const router = useRouter();
  const [rechargedBalancePaise, setRechargedBalancePaise] = React.useState<number | null>(
    null
  );
  const [selectedAmount, setSelectedAmount] = React.useState<number>(2000);
  const [customAmount, setCustomAmount] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const balancePaise = rechargedBalancePaise ?? institute.walletBalancePaise;

  if (!open) return null;

  const rechargeRupees = customAmount.trim() ? Number(customAmount) : selectedAmount;

  async function handleRecharge() {
    setError(null);
    setSuccess(null);
    if (
      !Number.isFinite(rechargeRupees) ||
      rechargeRupees < 100 ||
      rechargeRupees > 100000
    ) {
      setError("Enter a recharge amount between ₹100 and ₹1,00,000.");
      return;
    }

    setLoading(true);
    try {
      const orderRes = await fetch("/api/institute/wallet/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRupees: rechargeRupees }),
      });

      const orderJson = (await orderRes.json()) as {
        ok: boolean;
        data?: {
          orderId: string;
          amountPaise: number;
          bonusPaise: number;
          currency: string;
          keyId: string;
        };
        error?: { message?: string };
      };

      if (!orderRes.ok || !orderJson.ok || !orderJson.data) {
        setError(orderJson.error?.message ?? "Unable to create Razorpay order.");
        setLoading(false);
        return;
      }

      const loaded = await loadRazorpayCheckoutScript();
      if (!loaded || !window.Razorpay) {
        setError("Failed to load Razorpay Checkout script.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderJson.data.keyId,
        amount: orderJson.data.amountPaise,
        currency: orderJson.data.currency,
        name: "CertiDesk Pro",
        description: `Wallet Recharge ₹${rechargeRupees} — ${institute.name}`,
        order_id: orderJson.data.orderId,
        modal: {
          ondismiss: () => {
            setLoading(false);
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
            const verifyJson = (await verifyRes.json()) as {
              ok: boolean;
              data?: { balanceAfterPaise: number };
              error?: { message?: string };
            };
            if (!verifyRes.ok || !verifyJson.ok || !verifyJson.data) {
              setError(
                verifyJson.error?.message ??
                  "Payment verification failed. Contact support if debited."
              );
              return;
            }
            setRechargedBalancePaise(verifyJson.data.balanceAfterPaise);
            setSuccess(
              `Wallet recharged! New balance: ₹${(verifyJson.data.balanceAfterPaise / 100).toFixed(2)}`
            );
            setCustomAmount("");
            router.refresh();
          } catch {
            setError("Network error while verifying Razorpay payment.");
          } finally {
            setLoading(false);
          }
        },
      });
      rzp.open();
    } catch {
      setError("Network error communicating with wallet API.");
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Institute Wallet & Quick Recharge"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="border-border bg-background max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border flex items-center justify-between border-b pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary-soft text-primary flex h-9 w-9 items-center justify-center rounded-xl">
              <Wallet className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-semibold">
                Institute Wallet
              </h2>
              <p className="text-muted text-xs">
                {institute.name} ({institute.code})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wallet dialog"
            className="text-muted hover:bg-surface hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Balance Summary */}
        <div className="border-border bg-surface mt-4 grid grid-cols-2 gap-3 rounded-xl border p-4">
          <div>
            <p className="text-muted text-[11px] font-medium uppercase">
              Available Balance
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
              ₹{(balancePaise / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted text-[11px] font-medium uppercase">Admission Fee</p>
            <p className="text-foreground mt-1 text-lg font-semibold tabular-nums">
              ₹{(institute.admissionFeePaise / 100).toFixed(2)}
            </p>
            <p className="text-muted text-[11px]">per student</p>
          </div>
        </div>

        {error && (
          <div className="bg-danger-soft text-danger mt-3 flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs dark:border-red-800/70 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-success-soft text-success mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs dark:border-emerald-800/70 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        {/* Quick Recharge */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-foreground text-xs font-semibold">
              Quick Recharge via Razorpay
            </p>
            <Badge variant="primary">Instant Credit</Badge>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {QUICK_PACKS.map((pack) => {
              const active = !customAmount && selectedAmount === pack.amountRupees;
              return (
                <button
                  key={pack.amountRupees}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(pack.amountRupees);
                    setCustomAmount("");
                  }}
                  className={`cursor-pointer rounded-xl border p-2.5 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary-soft/60"
                      : "border-border bg-card hover:bg-surface"
                  }`}
                >
                  <p className="text-foreground text-sm font-bold">{pack.label}</p>
                  <p className="text-muted text-[10px] font-medium">{pack.sub}</p>
                </button>
              );
            })}
          </div>

          <Input
            label="Or Enter Custom Amount (₹100 – ₹1,00,000)"
            type="number"
            min={100}
            max={100000}
            placeholder="e.g. 1500"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />

          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            loading={loading}
            leftIcon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void handleRecharge()}
          >
            Recharge ₹{Number.isFinite(rechargeRupees) ? rechargeRupees : 0} via Razorpay
          </Button>
        </div>

        <div className="border-border mt-4 flex items-center justify-between border-t pt-3.5 text-xs">
          <Link
            href="/institute/wallet"
            onClick={onClose}
            className="text-primary inline-flex items-center gap-1 font-semibold hover:underline"
          >
            View Full Wallet &amp; Ledger
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
