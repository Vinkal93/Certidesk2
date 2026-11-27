"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

export interface NotFoundViewProps {
  code?: string;
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function NotFoundView({
  code = "404",
  title = "Page not found",
  description = "The page you are looking for moved, vanished, or never existed.",
  primaryHref = "/",
  primaryLabel = "Back home",
  secondaryHref = "/register",
  secondaryLabel = "Explore portals",
}: NotFoundViewProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = React.useState(10);

  const goBack = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace(primaryHref);
    }
  }, [router, primaryHref]);

  React.useEffect(() => {
    if (secondsLeft <= 0) {
      goBack();
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, goBack]);

  return (
    <main className="flex min-h-[75vh] w-full flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-60 w-full max-w-md items-center justify-center rounded-2xl bg-black shadow-xl">
        <span className="bg-gradient-to-b from-white via-neutral-300 to-neutral-700 bg-clip-text text-[7.5rem] leading-none font-extrabold tracking-tighter text-transparent select-none">
          {code}
        </span>
      </div>

      <h1 className="text-foreground mt-8 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted mt-2 max-w-sm text-sm">{description}</p>

      <div className="border-border bg-surface text-foreground mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium">
        <Clock className="text-primary h-3.5 w-3.5" aria-hidden="true" />
        <span>
          Returning to previous page in{" "}
          <strong className="text-primary font-mono">{secondsLeft}s</strong>...
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="bg-primary text-primary-foreground inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go Back Now
        </button>
        <Link
          href={primaryHref}
          className="border-border text-foreground hover:bg-surface bg-background inline-flex h-10 items-center justify-center rounded-full border px-6 text-sm font-medium transition-colors"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="border-border text-foreground hover:bg-surface bg-background inline-flex h-10 items-center justify-center rounded-full border px-6 text-sm font-medium transition-colors"
        >
          {secondaryLabel}
        </Link>
      </div>
    </main>
  );
}
