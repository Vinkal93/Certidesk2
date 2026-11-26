"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  ResolvingAlertBanner,
  type AlertStatus,
  type AlertTone,
  type ResolvingAlertAction,
} from "@/components/ui/resolving-alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FeedbackToastItem {
  id: string;
  tone: AlertTone;
  status: AlertStatus;
  title: React.ReactNode;
  description?: React.ReactNode;
  successTitle?: React.ReactNode;
  successDescription?: React.ReactNode;
  errorTitle?: React.ReactNode;
  errorDescription?: React.ReactNode;
  action?: ResolvingAlertAction;
  collapseOnSuccessMs?: number | false;
  dismissible?: boolean;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "warning" | "destructive" | "info";
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}

export interface ConfirmResult {
  confirmed: boolean;
  reason: string;
}

interface ActionFeedbackContextValue {
  notify: (
    item: Omit<FeedbackToastItem, "id" | "status"> & { status?: AlertStatus }
  ) => string;
  dismiss: (id: string) => void;
  runWithBanner: <T>(opts: {
    title: string;
    description?: string;
    successTitle?: string;
    successDescription?: string;
    errorTitle?: string;
    tone?: AlertTone;
    task: () => Promise<T>;
  }) => Promise<T>;
  confirm: (options: ConfirmOptions) => Promise<ConfirmResult>;
}

const ActionFeedbackContext = React.createContext<ActionFeedbackContextValue | null>(
  null
);

export function useActionFeedback(): ActionFeedbackContextValue {
  const ctx = React.useContext(ActionFeedbackContext);
  if (!ctx) {
    throw new Error("useActionFeedback must be used within ActionFeedbackProvider");
  }
  return ctx;
}

export function ActionFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<FeedbackToastItem[]>([]);
  const [confirmState, setConfirmState] = React.useState<{
    options: ConfirmOptions;
    resolve: (res: ConfirmResult) => void;
  } | null>(null);
  const [reasonText, setReasonText] = React.useState("");
  const [reasonError, setReasonError] = React.useState<string | null>(null);

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = React.useCallback(
    (item: Omit<FeedbackToastItem, "id" | "status"> & { status?: AlertStatus }) => {
      const id = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const entry: FeedbackToastItem = {
        ...item,
        id,
        status:
          item.status ??
          (item.tone === "success"
            ? "success"
            : item.tone === "destructive"
              ? "error"
              : "idle"),
        dismissible: item.dismissible ?? true,
        collapseOnSuccessMs: item.collapseOnSuccessMs ?? 2400,
      };
      setItems((prev) => [entry, ...prev].slice(0, 5));
      return id;
    },
    []
  );

  const runWithBanner = React.useCallback(
    async <T,>(opts: {
      title: string;
      description?: string;
      successTitle?: string;
      successDescription?: string;
      errorTitle?: string;
      tone?: AlertTone;
      task: () => Promise<T>;
    }): Promise<T> => {
      const id = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const execute = async (): Promise<T> => {
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, status: "pending" as const } : it))
        );
        try {
          const result = await opts.task();
          setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, status: "success" as const } : it))
          );
          return result;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Operation failed.";
          setItems((prev) =>
            prev.map((it) =>
              it.id === id
                ? {
                    ...it,
                    status: "error" as const,
                    errorDescription: msg,
                  }
                : it
            )
          );
          throw err;
        }
      };

      const newItem: FeedbackToastItem = {
        id,
        tone: opts.tone ?? "info",
        status: "pending",
        title: opts.title,
        ...(opts.description !== undefined ? { description: opts.description } : {}),
        ...(opts.successTitle !== undefined ? { successTitle: opts.successTitle } : {}),
        ...(opts.successDescription !== undefined
          ? { successDescription: opts.successDescription }
          : {}),
        ...(opts.errorTitle !== undefined ? { errorTitle: opts.errorTitle } : {}),
        collapseOnSuccessMs: 1800,
        dismissible: true,
        action: {
          label: "Retry",
          pendingLabel: "Working…",
          doneLabel: "Done",
          retryLabel: "Retry",
          onAction: execute,
        },
      };

      setItems((prev) => [newItem, ...prev].slice(0, 5));
      return execute();
    },
    []
  );

  const confirm = React.useCallback((options: ConfirmOptions) => {
    setReasonText("");
    setReasonError(null);
    return new Promise<ConfirmResult>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmClose = (confirmed: boolean) => {
    if (!confirmState) return;
    if (confirmed && confirmState.options.requireReason && !reasonText.trim()) {
      setReasonError("Please enter a reason to continue.");
      return;
    }
    const { resolve } = confirmState;
    const trimmed = reasonText.trim();
    setConfirmState(null);
    setReasonText("");
    setReasonError(null);
    resolve({ confirmed, reason: trimmed });
  };

  return (
    <ActionFeedbackContext.Provider value={{ notify, dismiss, runWithBanner, confirm }}>
      {children}

      {/* Top-right floating ResolvingAlertBanner stack */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 z-[90] flex w-[calc(100vw-2rem)] max-w-md flex-col gap-2.5"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="animate-in fade-in slide-in-from-top-2 pointer-events-auto duration-200"
          >
            <ResolvingAlertBanner
              tone={item.tone}
              status={item.status}
              title={item.title}
              {...(item.description !== undefined
                ? { description: item.description }
                : {})}
              {...(item.successTitle !== undefined
                ? { successTitle: item.successTitle }
                : {})}
              {...(item.successDescription !== undefined
                ? { successDescription: item.successDescription }
                : {})}
              {...(item.errorTitle !== undefined ? { errorTitle: item.errorTitle } : {})}
              {...(item.errorDescription !== undefined
                ? { errorDescription: item.errorDescription }
                : {})}
              {...(item.action !== undefined ? { action: item.action } : {})}
              collapseOnSuccessMs={item.collapseOnSuccessMs ?? 2000}
              dismissible={item.dismissible ?? true}
              onCollapse={() => dismiss(item.id)}
              onDismiss={() => dismiss(item.id)}
              className="shadow-lg"
            />
          </div>
        ))}
      </div>

      {/* Custom Confirmation Popup Modal */}
      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
        >
          <div className="border-border bg-card text-card-foreground w-full max-w-md rounded-2xl border p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                    confirmState.options.tone === "destructive"
                      ? "bg-destructive/10 text-destructive"
                      : confirmState.options.tone === "info"
                        ? "bg-primary/10 text-primary"
                        : "bg-warning-soft text-warning"
                  }`}
                >
                  {confirmState.options.tone === "info" ? (
                    <Info className="size-5" />
                  ) : confirmState.options.tone === "destructive" ? (
                    <AlertTriangle className="size-5" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}
                </span>
                <div>
                  <h3 className="text-base font-semibold">
                    {confirmState.options.title}
                  </h3>
                  {confirmState.options.description && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {confirmState.options.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => handleConfirmClose(false)}
                className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            {confirmState.options.requireReason && (
              <div className="mt-4 space-y-1.5">
                <label className="text-muted-foreground block text-xs font-medium">
                  {confirmState.options.reasonLabel ?? "Audit Reason (Required)"}
                </label>
                <Input
                  autoFocus
                  value={reasonText}
                  onChange={(e) => {
                    setReasonText(e.target.value);
                    if (reasonError) setReasonError(null);
                  }}
                  placeholder={
                    confirmState.options.reasonPlaceholder ?? "Enter reason..."
                  }
                />
                {reasonError && <p className="text-destructive text-xs">{reasonError}</p>}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleConfirmClose(false)}
              >
                {confirmState.options.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant={
                  confirmState.options.tone === "destructive" ? "destructive" : "primary"
                }
                size="sm"
                onClick={() => handleConfirmClose(true)}
              >
                {confirmState.options.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ActionFeedbackContext.Provider>
  );
}
