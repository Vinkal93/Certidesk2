"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  instituteId: string;
  label?: string;
  variant?: "primary" | "outline";
  size?: "sm" | "md";
  redirectTo?: string;
}

export function EnterLivePortalButton({
  instituteId,
  label = "Open Full Live Portal",
  variant = "primary",
  size = "sm",
  redirectTo = "/institute/dashboard",
}: Props) {
  const [loading, setLoading] = React.useState(false);

  async function handleEnter() {
    setLoading(true);
    try {
      const res = await fetch("/api/su/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instituteId, redirectTo }),
      });
      const json = (await res.json()) as { data?: { redirectUrl?: string } };
      if (res.ok && json.data?.redirectUrl) {
        window.location.assign(json.data.redirectUrl);
        return;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={loading}
      onClick={handleEnter}
    >
      <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      {loading ? "Opening Portal..." : label}
    </Button>
  );
}
