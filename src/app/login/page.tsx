import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, QrCode, ShieldCheck } from "lucide-react";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { SplitAuthLayout } from "@/features/auth/components/split-auth-layout";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "Sign In",
  "Choose your CertiDesk Pro Institute Admin or Student portal."
);

export default function LoginPage() {
  return (
    <SplitAuthLayout>
      <div className="space-y-6">
        <div className="text-center sm:text-left">
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            Portal Selection
          </p>
          <h1 className="text-foreground mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back!
          </h1>
          <p className="text-muted mt-1.5 text-sm">
            Select your portal first to open your dedicated sign-in screen.
          </p>
        </div>

        <div className="space-y-3.5">
          <Link
            href="/login/institute"
            className="border-border bg-background hover:border-primary/50 hover:bg-surface group flex items-start gap-4 rounded-2xl border p-4 shadow-xs transition"
          >
            <span className="bg-primary-soft text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-foreground text-base font-semibold">
                  Institute Admin &amp; Staff
                </h2>
                <ArrowRight
                  className="text-muted group-hover:text-primary h-4 w-4 transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                Sign in with Institute ID, email, or mobile number to manage admissions,
                fees, exams, and certificates.
              </p>
            </div>
          </Link>

          <Link
            href="/login/student"
            className="border-border bg-background hover:border-primary/50 hover:bg-surface group flex items-start gap-4 rounded-2xl border p-4 shadow-xs transition"
          >
            <span className="bg-primary-soft text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-foreground text-base font-semibold">
                  Student Portal
                </h2>
                <ArrowRight
                  className="text-muted group-hover:text-primary h-4 w-4 transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                Sign in with your assigned Student ID and password to view receipts,
                online exams, marksheets, and certificates.
              </p>
            </div>
          </Link>

          <Link
            href="/login/qr"
            className="border-border bg-background hover:border-primary/50 hover:bg-surface group flex items-start gap-4 rounded-2xl border p-4 shadow-xs transition"
          >
            <span className="bg-primary-soft text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-foreground text-base font-semibold">
                  QR Code Sign In (Phone &rarr; PC)
                </h2>
                <ArrowRight
                  className="text-muted group-hover:text-primary h-4 w-4 transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                Already signed in on your phone? Scan the desktop QR code from your
                profile menu to log in here instantly.
              </p>
            </div>
          </Link>
        </div>

        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs">
          <span className="text-muted">
            New institute?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Register Institute
            </Link>
          </span>
          <Link
            href="/su/login"
            className="text-muted hover:text-foreground inline-flex items-center gap-1 font-medium"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Platform Admin
          </Link>
        </div>
      </div>
    </SplitAuthLayout>
  );
}
