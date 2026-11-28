"use client";

import * as React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  recordLabel,
  affectedSummary,
  dependencyWarning,
  confirmLabel = "Confirm Delete",
  loading = false,
  requireForceCheckbox = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, force: boolean) => void | Promise<void>;
  title: string;
  recordLabel: string;
  affectedSummary: string;
  dependencyWarning?: string | null;
  confirmLabel?: string;
  loading?: boolean;
  requireForceCheckbox?: boolean;
}) {
  const [reason, setReason] = React.useState("");
  const [forceChecked, setForceChecked] = React.useState(false);

  if (!open) return null;

  const canConfirm = reason.trim().length >= 3 && (!requireForceCheckbox || forceChecked);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="border-border bg-background w-full max-w-md rounded-2xl border p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-danger-soft text-danger flex h-9 w-9 items-center justify-center rounded-xl">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-foreground text-base font-semibold">{title}</h3>
              <p className="text-muted text-xs">{recordLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close confirmation"
            className="text-muted hover:bg-surface hover:text-foreground rounded-lg p-1.5"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <p className="text-muted leading-relaxed">{affectedSummary}</p>

          {dependencyWarning && (
            <div className="bg-warning-soft flex items-start gap-2 rounded-xl border border-amber-200 p-3 text-amber-900 dark:border-amber-800/60 dark:text-amber-200">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span>{dependencyWarning}</span>
            </div>
          )}

          <Input
            label="Reason (Required for Audit Trail)"
            placeholder="e.g. Duplicate entry / Cancelled by student"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          {requireForceCheckbox && (
            <label className="text-foreground flex cursor-pointer items-start gap-2 pt-1">
              <input
                type="checkbox"
                checked={forceChecked}
                onChange={(e) => setForceChecked(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I understand dependencies exist and want to proceed with soft-deletion.
              </span>
            </label>
          )}
        </div>

        <div className="border-border mt-5 flex justify-end gap-2 border-t pt-3.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            loading={loading}
            disabled={!canConfirm}
            onClick={() => void onConfirm(reason.trim(), forceChecked)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
