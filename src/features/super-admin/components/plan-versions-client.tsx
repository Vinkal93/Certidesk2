"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanVersionRecord } from "@/types/billing";

export function PlanVersionsClient({
  initialVersions,
  featureKeys,
}: {
  initialVersions: PlanVersionRecord[];
  featureKeys: ReadonlyArray<{ key: string; label: string }>;
}) {
  const [versions, setVersions] = React.useState(initialVersions);
  const [planCode, setPlanCode] = React.useState("PRO");
  const [name, setName] = React.useState("Pro Institute Plan");
  const [description, setDescription] = React.useState(
    "Full academic, exam, certificate, and prepaid wallet operations."
  );
  const [priceRupees, setPriceRupees] = React.useState("1999");
  const [billingModel, setBillingModel] = React.useState<
    "prepaid_wallet" | "subscription" | "hybrid"
  >("hybrid");
  const [maxStudents, setMaxStudents] = React.useState("500");
  const [maxStaff, setMaxStaff] = React.useState("25");
  const [storageLimitMb, setStorageLimitMb] = React.useState("2048");
  const [status, setStatus] = React.useState<"draft" | "active">("active");
  const [selectedFeatures, setSelectedFeatures] = React.useState<string[]>(
    featureKeys.slice(0, 8).map((f) => f.key)
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const toggleFeature = (key: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/su/billing/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          planId: planCode.trim().toLowerCase(),
          planCode,
          name,
          description,
          billingModel,
          priceRupees: Number(priceRupees),
          billingInterval: "monthly",
          trialDays: 0,
          gracePeriodDays: 7,
          overagePolicy: "block",
          maxStudents: Number(maxStudents),
          maxStaff: Number(maxStaff),
          storageLimitMb: Number(storageLimitMb),
          maxCertificatesPerMonth: 1000,
          maxMarksheetsPerMonth: 1000,
          maxApiCallsPerDay: 5000,
          features: selectedFeatures,
          isPublic: true,
          status,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { version: PlanVersionRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create plan version.");
        return;
      }
      setVersions((prev) => [json.data!.version, ...prev]);
      setMessage(`Published ${json.data.version.id} (v${json.data.version.version}).`);
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (versionId: string, nextStatus: "active" | "retired") => {
    setLoading(true);
    try {
      const res = await fetch("/api/su/billing/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", versionId, status: nextStatus }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { version: PlanVersionRecord };
      };
      if (res.ok && json.ok && json.data) {
        setVersions((prev) =>
          prev.map((v) => (v.id === versionId ? json.data!.version : v))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="text-primary h-4 w-4" aria-hidden="true" />
            Publish Versioned Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Plan Code"
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value)}
                required
              />
              <Input
                label="Price (₹)"
                type="number"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                required
              />
            </div>
            <Input
              label="Plan Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Max Students"
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
              />
              <Input
                label="Max Staff"
                type="number"
                value={maxStaff}
                onChange={(e) => setMaxStaff(e.target.value)}
              />
              <Input
                label="Storage (MB)"
                type="number"
                value={storageLimitMb}
                onChange={(e) => setStorageLimitMb(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <select
                aria-label="Billing model"
                value={billingModel}
                onChange={(e) =>
                  setBillingModel(
                    e.target.value as "prepaid_wallet" | "subscription" | "hybrid"
                  )
                }
                className="border-border bg-background h-9 rounded-lg border px-2.5"
              >
                <option value="prepaid_wallet">Prepaid Wallet</option>
                <option value="subscription">Subscription</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <select
                aria-label="Plan status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "active")}
                className="border-border bg-background h-9 rounded-lg border px-2.5"
              >
                <option value="active">Active (Published)</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div className="border-border max-h-36 space-y-1 overflow-y-auto rounded-lg border p-2.5 text-xs">
              <p className="font-semibold">Included Features</p>
              <div className="grid grid-cols-2 gap-1">
                {featureKeys.map((f) => (
                  <label key={f.key} className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedFeatures.includes(f.key)}
                      onChange={() => toggleFeature(f.key)}
                    />
                    <span className="truncate font-mono text-[11px]">{f.key}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" size="sm" loading={loading}>
              Create Plan Version
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="text-base">
            Published &amp; Draft Plan Versions ({versions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {versions.length === 0 ? (
            <p className="text-muted p-6 text-center text-sm">
              No versioned plans created yet.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{v.name}</span>
                      <Badge variant="outline">
                        {v.planCode} v{v.version}
                      </Badge>
                      <Badge
                        variant={
                          v.status === "active"
                            ? "success"
                            : v.status === "retired"
                              ? "danger"
                              : "outline"
                        }
                      >
                        {v.status}
                      </Badge>
                    </div>
                    <p className="text-muted mt-1 font-mono">
                      ₹{(v.pricePaise / 100).toFixed(2)}/{v.billingInterval} ·{" "}
                      {v.allowances.maxStudents} students ·{" "}
                      {Math.round(v.allowances.storageLimitBytes / (1024 * 1024))} MB ·{" "}
                      {v.features.length} features
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {v.status === "draft" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => changeStatus(v.id, "active")}
                      >
                        Publish
                      </Button>
                    )}
                    {v.status === "active" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => changeStatus(v.id, "retired")}
                      >
                        Retire
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
