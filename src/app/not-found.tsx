import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[65vh] flex-col items-center justify-center py-20 text-center">
      <div className="bg-primary-soft text-primary mb-5 flex h-14 w-14 items-center justify-center rounded-full">
        <FileQuestion className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="text-primary text-sm font-semibold tracking-wider uppercase">
        404 — Page Not Found
      </p>
      <h1 className="text-foreground mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="text-muted mt-3 max-w-md text-sm sm:text-base">
        The page you requested may have been moved or does not exist. Explore our
        institute management platform from the home page.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonVariants({ variant: "primary" })}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Return Home
        </Link>
        <Link href="/contact" className={buttonVariants({ variant: "outline" })}>
          Contact Support
        </Link>
      </div>
    </Container>
  );
}
