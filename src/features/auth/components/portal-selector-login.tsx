"use client";

import * as React from "react";
import { Building2, GraduationCap } from "lucide-react";
import { cn } from "@/lib/cn";
import { PortalLoginForm } from "./portal-login-form";

type SelectablePortal = "institute" | "student";

export function PortalSelectorLogin() {
  const [selectedPortal, setSelectedPortal] =
    React.useState<SelectablePortal>("institute");

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Select portal type"
        className="border-border bg-background grid grid-cols-2 gap-2 rounded-xl border p-1.5 shadow-xs"
      >
        <button
          role="tab"
          type="button"
          aria-selected={selectedPortal === "institute"}
          onClick={() => setSelectedPortal("institute")}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            selectedPortal === "institute"
              ? "bg-navy text-white shadow-xs"
              : "text-muted hover:text-foreground"
          )}
        >
          <Building2 className="h-4 w-4" aria-hidden="true" />
          Institute Portal
        </button>

        <button
          role="tab"
          type="button"
          aria-selected={selectedPortal === "student"}
          onClick={() => setSelectedPortal("student")}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            selectedPortal === "student"
              ? "bg-navy text-white shadow-xs"
              : "text-muted hover:text-foreground"
          )}
        >
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
          Student Portal
        </button>
      </div>

      {selectedPortal === "institute" ? (
        <PortalLoginForm
          key="institute"
          portal="institute"
          badgeLabel="Institute Administration"
          title="Sign in to Institute Portal"
          description="Use your assigned Institute ID and password to manage students, staff, wallet, and certificates."
        />
      ) : (
        <PortalLoginForm
          key="student"
          portal="student"
          badgeLabel="Student Access"
          title="Sign in to Student Portal"
          description="Use the Student ID and credentials issued by your institute to view your profile and certificates."
        />
      )}
    </div>
  );
}
