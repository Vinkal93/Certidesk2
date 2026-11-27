import Link from "next/link";
import { ShieldAlert, Wrench } from "lucide-react";
import type { PolicyEvaluationResult } from "@/types/emergency";

interface Props {
  policy: PolicyEvaluationResult;
  portalLabel: string;
}

export function MaintenanceLockdownScreen({ policy, portalLabel }: Props) {
  const isMaintenance = policy.code === "MAINTENANCE_ACTIVE";

  return (
    <div className="bg-surface flex min-h-screen items-center justify-center px-4 py-12">
      <div className="border-border bg-card w-full max-w-lg rounded-2xl border p-8 shadow-sm">
        <div
          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${
            isMaintenance
              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
              : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
          }`}
        >
          {isMaintenance ? (
            <Wrench className="h-6 w-6" aria-hidden="true" />
          ) : (
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          )}
        </div>

        <p className="text-muted text-xs font-semibold tracking-wider uppercase">
          {portalLabel} &bull;{" "}
          {isMaintenance ? "Scheduled Maintenance" : "Emergency Access Restriction"}
        </p>

        <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight">
          {isMaintenance
            ? "Platform Maintenance in Progress"
            : "Workspace Temporarily Restricted"}
        </h1>

        <p className="text-muted mt-3 text-sm leading-relaxed">{policy.message}</p>

        {policy.expectedEndAt && (
          <div className="border-border bg-surface mt-5 rounded-lg border px-4 py-3 text-xs">
            <span className="text-muted">Expected Availability: </span>
            <span className="text-foreground font-mono font-medium">
              {new Date(policy.expectedEndAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="border-border text-foreground hover:bg-surface inline-flex items-center rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
          >
            Return to Home
          </Link>
          <Link
            href="/contact"
            className="bg-primary text-primary-foreground inline-flex items-center rounded-lg px-4 py-2 text-xs font-medium transition-opacity hover:opacity-90"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
