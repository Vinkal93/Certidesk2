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
  UserCheck,
} from "lucide-react";
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RegisterWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2>(1);

  const [instituteName, setInstituteName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [acceptTerms, setAcceptTerms] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (instituteName.trim().length < 3) {
      setError("Institute name must be at least 3 characters.");
      return;
    }
    if (address.trim().length < 5) {
      setError("Institute address must be at least 5 characters.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptTerms) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituteName,
          address,
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

      router.replace(
        `/register/verify?code=${encodeURIComponent(json.data.instituteCode)}`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevated>
      <CardHeader>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              step === 1 ? "bg-navy text-white" : "bg-success-soft text-success"
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
              step === 2 ? "bg-navy text-white" : "bg-surface text-muted"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            2. Owner &amp; Security
          </span>
          <span className="text-muted">→</span>
          <span className="bg-surface text-muted rounded-full px-2.5 py-1">
            3. Wallet
          </span>
        </div>
        <CardTitle className="text-xl">
          {step === 1 ? "Create your Institute Workspace" : "Owner & Contact Credentials"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div
            role="alert"
            className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNextStep} className="space-y-4">
            <Input
              label="Institute Name"
              placeholder="e.g. Apex Skill Academy"
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              required
            />
            <Input
              label="Institute Address"
              placeholder="Full campus or branch address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/login"
                className="text-muted hover:text-foreground text-xs font-medium"
              >
                Already registered? Sign in
              </Link>
              <Button
                type="submit"
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              >
                Continue
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Owner Full Name"
              placeholder="e.g. Rajesh Sharma"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Official Email"
                type="email"
                placeholder="owner@institute.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Mobile Number (10 digits)"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Password"
                type="password"
                placeholder="Min 8 chars, A-Z, a-z, 0-9"
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

            <label className="text-muted flex cursor-pointer items-start gap-2.5 text-xs">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-primary underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
              >
                Back
              </Button>
              <Button
                type="submit"
                loading={loading}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              >
                Register Institute
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
