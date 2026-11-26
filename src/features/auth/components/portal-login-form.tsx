"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { AlertCircle, ArrowRight, Lock } from "lucide-react";
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
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
        ? "Institute ID"
        : "Student ID";

  const fieldPlaceholder =
    portal === "super_admin"
      ? "admin@certidesk.app"
      : portal === "institute"
        ? "e.g. INS-APEX-1A2B"
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

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          leftAddon={<Lock className="h-4 w-4" aria-hidden="true" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

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
    </div>
  );
}
