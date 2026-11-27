"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import {
  instituteLoginSchema,
  studentLoginSchema,
  superAdminLoginSchema,
} from "@/lib/validation/auth";
import { PORTAL_HOME_ROUTES } from "@/lib/security/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PortalType } from "@/types/auth";

export interface PortalLoginFormProps {
  portal: PortalType;
  title: string;
  description: string;
  badgeLabel: string;
}

interface SessionApiError {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
}

export function PortalLoginForm({
  portal,
  title,
  description,
  badgeLabel,
}: PortalLoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showForgotHelp, setShowForgotHelp] = React.useState(false);
  const [pendingSuToken, setPendingSuToken] = React.useState<string | null>(null);
  const [secretCode, setSecretCode] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSecretSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingSuToken) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: pendingSuToken,
          portal: "super_admin",
          secretCode: secretCode.trim(),
        }),
      });
      const sessionJson = (await sessionRes.json()) as { ok: true } | SessionApiError;
      if (!sessionRes.ok || !sessionJson.ok) {
        setErrorMessage(
          !sessionJson.ok
            ? (sessionJson.error?.message ?? "Invalid Super Admin Secret Key.")
            : "Invalid Super Admin Secret Key."
        );
        return;
      }
      router.replace(PORTAL_HOME_ROUTES.super_admin);
      router.refresh();
    } catch {
      setErrorMessage("Unable to verify Super Admin Secret Key.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!isFirebaseClientConfigured()) {
      setErrorMessage("Firebase Client SDK is not configured in environment variables.");
      return;
    }

    setIsSubmitting(true);

    try {
      let authEmail: string;

      if (portal === "super_admin") {
        const parsed = superAdminLoginSchema.safeParse({
          email: identifier,
          password,
        });
        if (!parsed.success) {
          setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid input.");
          return;
        }
        authEmail = parsed.data.email;
      } else if (portal === "institute") {
        const parsed = instituteLoginSchema.safeParse({
          instituteId: identifier,
          password,
        });
        if (!parsed.success) {
          setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid input.");
          return;
        }
        const resolveRes = await fetch("/api/auth/resolve-identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portal: "institute",
            identifier: parsed.data.instituteId,
          }),
        });
        const resolveJson = (await resolveRes.json()) as
          { ok: true; data: { authEmail: string } } | SessionApiError;
        if (!resolveRes.ok || !resolveJson.ok) {
          setErrorMessage(
            !resolveJson.ok
              ? (resolveJson.error?.message ?? "Invalid Institute ID or password.")
              : "Invalid Institute ID or password."
          );
          return;
        }
        authEmail = resolveJson.data.authEmail;
      } else {
        const parsed = studentLoginSchema.safeParse({
          studentId: identifier,
          password,
        });
        if (!parsed.success) {
          setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid input.");
          return;
        }
        const resolveRes = await fetch("/api/auth/resolve-identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portal: "student",
            identifier: parsed.data.studentId,
          }),
        });
        const resolveJson = (await resolveRes.json()) as
          { ok: true; data: { authEmail: string } } | SessionApiError;
        if (!resolveRes.ok || !resolveJson.ok) {
          setErrorMessage(
            !resolveJson.ok
              ? (resolveJson.error?.message ?? "Invalid Student ID or password.")
              : "Invalid Student ID or password."
          );
          return;
        }
        authEmail = resolveJson.data.authEmail;
      }

      const auth = getClientAuth();
      const credential = await signInWithEmailAndPassword(auth, authEmail, password);
      const idToken = await credential.user.getIdToken(true);

      if (portal === "super_admin") {
        setPendingSuToken(idToken);
        setSecretCode("");
        return;
      }

      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, portal }),
      });

      const sessionJson = (await sessionRes.json()) as { ok: true } | SessionApiError;

      if (!sessionRes.ok || !sessionJson.ok) {
        await signOut(auth).catch(() => undefined);
        setErrorMessage(
          !sessionJson.ok
            ? (sessionJson.error?.message ?? "Authentication rejected for this portal.")
            : "Authentication rejected for this portal."
        );
        return;
      }

      router.replace(PORTAL_HOME_ROUTES[portal]);
      router.refresh();
    } catch {
      setErrorMessage("Invalid credentials or unable to complete sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldLabel =
    portal === "super_admin"
      ? "Super Admin Email"
      : portal === "institute"
        ? "Institute ID, Email, or Mobile Number"
        : "Student ID";

  const fieldPlaceholder =
    portal === "super_admin"
      ? "admin@certidesk.app"
      : portal === "institute"
        ? "e.g. INS-APEX-1A2B, owner@inst.edu, or 9876543210"
        : "e.g. STU-1A2B26-3C4D5E";

  return (
    <div className="border-border bg-background rounded-2xl border p-6 shadow-md sm:p-8">
      <div className="mb-6 flex flex-col items-start gap-2">
        <Badge variant={portal === "super_admin" ? "navy" : "primary"}>
          {badgeLabel}
        </Badge>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted text-sm">{description}</p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="bg-danger-soft text-danger mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 p-3.5 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {portal === "super_admin" && pendingSuToken ? (
        <form onSubmit={handleSecretSubmit} className="space-y-4">
          <div className="border-border bg-surface rounded-xl border p-3.5 text-xs">
            <p className="text-foreground font-semibold">
              Step 2 of 2: Super Admin Secret Key Required
            </p>
            <p className="text-muted mt-0.5">
              Credentials verified for{" "}
              <strong className="text-foreground">{identifier}</strong>. Enter your Super
              Admin Secret Key to unlock the Control Center.
            </p>
          </div>

          <Input
            label="Super Admin Secret Key"
            type="password"
            placeholder="Enter secret key"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            autoFocus
            required
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setPendingSuToken(null);
                setSecretCode("");
                setErrorMessage(null);
              }}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isSubmitting}
              rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            >
              Verify &amp; Sign In
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label={fieldLabel}
            type={portal === "super_admin" ? "email" : "text"}
            placeholder={fieldPlaceholder}
            autoComplete={portal === "super_admin" ? "email" : "username"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              leftAddon={<Lock className="h-4 w-4" aria-hidden="true" />}
              className="pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-muted hover:text-foreground absolute top-[34px] right-3 cursor-pointer p-1"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowForgotHelp((prev) => !prev)}
              className="text-primary cursor-pointer text-xs font-medium hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {showForgotHelp ? (
            <div className="border-border bg-surface text-muted rounded-lg border p-3 text-xs leading-relaxed">
              {portal === "student"
                ? "Contact your Institute Admin to reset your Student Portal password or reissue temporary activation credentials."
                : "Use your registered owner email or contact CertiDesk Pro support to verify ownership and reset your password."}
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            Sign In
          </Button>
        </form>
      )}
    </div>
  );
}
