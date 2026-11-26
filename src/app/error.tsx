"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Application route error:", error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="bg-danger-soft text-danger mb-5 flex h-14 w-14 items-center justify-center rounded-full">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
        Something went wrong
      </h1>
      <p className="text-muted mt-2 max-w-md text-sm sm:text-base">
        An unexpected error occurred while rendering this page. You can try reloading the
        view or return to the home page.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} leftIcon={<RotateCcw className="h-4 w-4" />}>
          Try again
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to Home
        </Link>
      </div>
    </Container>
  );
}
