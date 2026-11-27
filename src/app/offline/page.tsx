import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "Offline",
  "You are currently offline. Reconnect to access live CertiDesk Pro portals."
);

export default function OfflinePage() {
  return (
    <main className="bg-background flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="border-border bg-surface max-w-md rounded-3xl border p-8 text-center shadow-sm">
        <span className="bg-primary-soft text-primary mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
          <WifiOff className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight">
          You&apos;re Offline
        </h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          CertiDesk Pro requires an active internet connection to sync student records,
          wallet balances, and verification data. Reconnect and try again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="bg-primary inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
          >
            Retry Connection
          </Link>
          <Link
            href="/download"
            className="border-border bg-background text-foreground inline-flex h-10 items-center justify-center rounded-xl border px-5 text-sm font-semibold"
          >
            App Info
          </Link>
        </div>
      </div>
    </main>
  );
}
