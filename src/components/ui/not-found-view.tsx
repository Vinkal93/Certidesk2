import Link from "next/link";

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
  secondaryHref = "/get-started",
  secondaryLabel = "Explore portals",
}: NotFoundViewProps) {
  return (
    <main className="flex min-h-[75vh] w-full flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-60 w-full max-w-md items-center justify-center rounded-2xl bg-black shadow-xl">
        <span className="bg-gradient-to-b from-white via-neutral-300 to-neutral-700 bg-clip-text text-[7.5rem] leading-none font-extrabold tracking-tighter text-transparent select-none">
          {code}
        </span>
      </div>

      <h1 className="text-foreground mt-8 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">{description}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={primaryHref}
          className="inline-flex h-10 items-center justify-center rounded-full bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="border-border text-foreground hover:bg-surface inline-flex h-10 items-center justify-center rounded-full border bg-white px-6 text-sm font-medium transition-colors"
        >
          {secondaryLabel}
        </Link>
      </div>
    </main>
  );
}
