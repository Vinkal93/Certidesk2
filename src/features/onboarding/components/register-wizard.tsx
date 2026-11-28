"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionPlanRecord } from "@/services/su-platform.service";

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

export function RegisterWizard({ plans = [] }: { plans?: SubscriptionPlanRecord[] }) {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Step 1 — Institute Details
  const [instituteName, setInstituteName] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");

  // Step 2 — Account Security
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [acceptTerms, setAcceptTerms] = React.useState(false);

  // Step 3 — Plan & Payment
  const [createdCode, setCreatedCode] = React.useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>(
    plans[0]?.id ?? "free_starter"
  );
  const [paymentStatus, setPaymentStatus] = React.useState<
    "idle" | "pending" | "success" | "failed"
  >("idle");
  const [txRef, setTxRef] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (instituteName.trim().length < 3) {
      setError("Institute name must be at least 3 characters.");
      return;
    }
    if (ownerName.trim().length < 2) {
      setError("Owner name is required.");
      return;
    }
    if (phone.trim().length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setStep(2);
  };

  const handleStep2CreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptTerms) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    if (createdCode) {
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituteName,
          address: address.trim() || `${instituteName.trim()} Campus`,
          ownerName,
          email,
          phone,
          password,
          confirmPassword,
          acceptTerms,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { instituteCode: string; loginEmail: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(
          json.error?.message ?? "Registration failed. Please verify your inputs."
        );
        return;
      }

      if (isFirebaseClientConfigured()) {
        const auth = getClientAuth();
        const cred = await signInWithEmailAndPassword(
          auth,
          json.data.loginEmail,
          password
        );
        const idToken = await cred.user.getIdToken(true);
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, portal: "institute" }),
        });
      }

      setCreatedCode(json.data.instituteCode);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateOrPay = async () => {
    setError(null);
    const amountRupees = selectedPlan ? selectedPlan.monthlyDisplayRupees : 0;

    if (amountRupees <= 0 || selectedPlanId === "free_starter") {
      setPaymentStatus("success");
      setTxRef(`TRIAL-${createdCode ?? Date.now()}`);
      router.replace("/institute/dashboard");
      router.refresh();
      return;
    }

    setLoading(true);
    setPaymentStatus("pending");
    try {
      const orderRes = await fetch("/api/institute/wallet/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRupees }),
      });
      const orderJson = (await orderRes.json()) as {
        ok: boolean;
        data?: {
          orderId: string;
          amountPaise: number;
          currency: string;
          keyId: string;
        };
        error?: { message?: string };
      };

      if (!orderRes.ok || !orderJson.ok || !orderJson.data) {
        setPaymentStatus("failed");
        setError(
          orderJson.error?.message ??
            "Unable to initialize payment gateway. You can retry or start with ₹0 Setup."
        );
        setLoading(false);
        return;
      }

      const loaded = await loadRazorpayCheckoutScript();
      if (!loaded || !window.Razorpay) {
        setPaymentStatus("failed");
        setError("Failed to load Razorpay Checkout script. Please retry.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderJson.data.keyId,
        amount: orderJson.data.amountPaise,
        currency: orderJson.data.currency,
        name: "CertiDesk Pro",
        description: `${selectedPlan?.name ?? "Plan"} Activation — ${instituteName}`,
        order_id: orderJson.data.orderId,
        modal: {
          ondismiss: () => {
            setPaymentStatus("failed");
            setError("Payment cancelled. Click Retry Payment to complete activation.");
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
              error?: { message?: string };
            };
            if (!verifyRes.ok || !verifyJson.ok) {
              setPaymentStatus("failed");
              setError(
                verifyJson.error?.message ?? "Payment verification failed. Please retry."
              );
              return;
            }
            setPaymentStatus("success");
            setTxRef(response.razorpay_payment_id);
            router.replace("/institute/dashboard");
            router.refresh();
          } catch {
            setPaymentStatus("failed");
            setError("Network error verifying payment.");
          } finally {
            setLoading(false);
          }
        },
      });
      rzp.open();
    } catch {
      setPaymentStatus("failed");
      setError("Network error communicating with payment server.");
      setLoading(false);
    }
  };

  return (
    <Card elevated>
      <CardHeader>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              step === 1 ? "bg-primary text-white" : "bg-success-soft text-success"
            }`}
          >
            {step > 1 ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            1. Institute Details
          </span>
          <span className="text-muted">→</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              step === 2
                ? "bg-primary text-white"
                : step > 2
                  ? "bg-success-soft text-success"
                  : "bg-surface text-muted"
            }`}
          >
            {step > 2 ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            2. Account Security
          </span>
          <span className="text-muted">→</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              step === 3 ? "bg-primary text-white" : "bg-surface text-muted"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            3. Plan &amp; Payment
          </span>
        </div>
        <CardTitle className="text-xl">
          {step === 1
            ? "Step 1: Institute Details"
            : step === 2
              ? "Step 2: Account Security"
              : "Step 3: Choose Plan & Complete Payment"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div
            role="alert"
            className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-sm dark:border-red-800/60"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-4">
            <Input
              label="Institute Name"
              placeholder="e.g. SBCI Computer Institute"
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              required
            />
            <Input
              label="Owner / Director Name"
              placeholder="Full name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="admin@institute.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Input
              label="Campus / City Address"
              placeholder="Full address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Button type="submit" fullWidth size="lg">
              Continue to Account Security
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2CreateAccount} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <label className="border-border bg-surface flex cursor-pointer items-start gap-2.5 rounded-xl border p-3.5 text-xs">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-muted">
                I accept the{" "}
                <Link href="/terms" className="text-primary underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary underline">
                  Privacy Policy
                </Link>{" "}
                for my institute workspace.
              </span>
            </label>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
              >
                Back
              </Button>
              <Button type="submit" fullWidth size="lg" loading={loading}>
                Create Account &amp; Continue to Plan
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {createdCode && (
              <div className="bg-success-soft text-success flex items-center justify-between rounded-xl border border-emerald-200 p-3 text-xs dark:border-emerald-800/60">
                <span>
                  Institute workspace <strong>{createdCode}</strong> created with default{" "}
                  <strong>Cash</strong> &amp; <strong>Bank</strong> accounts!
                </span>
                <Badge variant="success">Ready</Badge>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {plans.map((p) => {
                const active = selectedPlanId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`cursor-pointer rounded-xl border p-4 text-left transition-all ${
                      active
                        ? "border-primary bg-primary-soft/50 shadow-xs"
                        : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground text-sm font-bold">{p.name}</span>
                      <Badge variant="primary">Plan</Badge>
                    </div>
                    <p className="text-foreground mt-2 text-2xl font-bold tabular-nums">
                      ₹{p.monthlyDisplayRupees.toLocaleString("en-IN")}
                      <span className="text-muted text-xs font-normal"> / month</span>
                    </p>
                    <p className="text-muted mt-1 text-xs">{p.description}</p>
                    <p className="text-muted mt-2 text-[11px]">
                      Up to {p.maxStudents.toLocaleString("en-IN")} students ·{" "}
                      {p.maxStaff} staff
                    </p>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedPlanId("free_starter")}
                className={`cursor-pointer rounded-xl border p-4 text-left transition-all ${
                  selectedPlanId === "free_starter"
                    ? "border-primary bg-primary-soft/50 shadow-xs"
                    : "border-border bg-surface hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground text-sm font-bold">
                    ₹0 Prepaid Setup
                  </span>
                  <Badge variant="outline">Pay Later</Badge>
                </div>
                <p className="text-foreground mt-2 text-2xl font-bold tabular-nums">₹0</p>
                <p className="text-muted mt-1 text-xs">
                  Start exploring your dashboard immediately and recharge wallet anytime.
                </p>
              </button>
            </div>

            {paymentStatus === "success" && txRef && (
              <div className="bg-success-soft text-success rounded-xl border border-emerald-200 p-3 text-xs dark:border-emerald-800/60">
                Payment verified! Transaction Ref: <strong>{txRef}</strong>
              </div>
            )}

            <Button
              type="button"
              fullWidth
              size="lg"
              loading={loading}
              leftIcon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void handleActivateOrPay()}
            >
              {selectedPlan &&
              selectedPlan.monthlyDisplayRupees > 0 &&
              selectedPlanId !== "free_starter"
                ? paymentStatus === "failed"
                  ? `Retry Payment (₹${selectedPlan.monthlyDisplayRupees})`
                  : `Pay ₹${selectedPlan.monthlyDisplayRupees} & Activate Workspace`
                : "Activate Free Workspace & Open Dashboard"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
