"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

/**
 * Responsive creation/edit modal:
 * - Desktop: centered modal with max-width and visible backdrop.
 * - Mobile: full-screen sheet with sticky header & safe-area scrollable body so keyboard never hides fields.
 */
export function ResponsiveFormModal({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClass = "sm:max-w-2xl",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`border-border bg-background flex h-[100dvh] w-full flex-col overflow-hidden sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border sm:shadow-2xl ${maxWidthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-foreground truncate text-base font-semibold">{title}</h2>
            {subtitle && <p className="text-muted mt-0.5 text-xs">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-muted hover:bg-surface hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Contextual Floating Action Button (FAB) visible on mobile (< sm) only.
 */
export function MobileFab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="bg-primary hover:bg-primary-dark fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform active:scale-95 sm:hidden"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
