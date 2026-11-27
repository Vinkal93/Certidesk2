"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingActionButton({
  action,
  nextHref,
  label,
  variant = "primary",
  icon = "arrow",
}: {
  action: "mark_verified" | "skip_wallet" | "complete";
  nextHref: string;
  label: string;
  variant?: "primary" | "outline" | "secondary";
  icon?: "arrow" | "skip" | "check";
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await fetch("/api/institute/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.push(nextHref);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const IconEl =
    icon === "skip" ? (
      <SkipForward className="h-4 w-4" aria-hidden="true" />
    ) : icon === "check" ? (
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
    ) : (
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    );

  return (
    <Button
      type="button"
      variant={variant}
      loading={loading}
      onClick={handleClick}
      rightIcon={IconEl}
    >
      {label}
    </Button>
  );
}
