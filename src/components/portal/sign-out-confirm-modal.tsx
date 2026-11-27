"use client";

import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutConfirmModal({
  open,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm Sign Out"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="border-border bg-background w-full max-w-sm rounded-2xl border p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-danger-soft text-danger flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-semibold">
                Sign out of your portal?
              </h2>
              <p className="text-muted mt-0.5 text-xs">
                You will be redirected to the home page immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            aria-label="Close sign out confirmation"
            className="text-muted hover:bg-surface hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {loading ? "Signing out..." : "Yes, Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );
}
