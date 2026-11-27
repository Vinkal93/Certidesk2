"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";

export function BackToTopButton({ footerId = "site-footer" }: { footerId?: string }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const target = document.getElementById(footerId);
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.08 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [footerId]);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="border-border bg-background/95 text-foreground hover:bg-primary hover:border-primary fixed right-5 bottom-5 z-40 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition hover:text-white"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
