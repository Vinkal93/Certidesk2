"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionPlanRecord } from "@/services/su-platform.service";

export function PlansClient({
  initialPlans,
}: {
  initialPlans: SubscriptionPlanRecord[];
}) {
  const [plans, setPlans] = React.useState(initialPlans);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [monthlyDisplayRupees, setMonthlyDisplayRupees] = React.useState("0");
  const [yearlyDisplayRupees, setYearlyDisplayRupees] = React.useState("0");
  const [maxStudents, setMaxStudents] = React.useState("500");
  const [maxStaff, setMaxStaff] = React.useState("20");
  const [storageLimitMb, setStorageLimitMb] = React.useState("2048");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/su/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          monthlyDisplayRupees: Number(monthlyDisplayRupees),
          yearlyDisplayRupees: Number(yearlyDisplayRupees),
          maxStudents: Number(maxStudents),
          maxStaff: Number(maxStaff),
          storageLimitMb: Number(storageLimitMb),
          active: true,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { plan: SubscriptionPlanRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create plan.");
        return;
      }
      setPlans((prev) => [json.data!.plan, ...prev]);
      setName("");
      setDescription("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="text-muted py-10 text-center text-sm">
              No institute plans configured yet.
            </CardContent>
          </Card>
        ) : (
          plans.map((p) => (
            <Card key={p.id}>
              <CardHeader className="border-border flex flex-row items-center justify-between border-b pb-3">
                <div>
                  <CardTitle>{p.name}</CardTitle>
                  <p className="text-muted text-xs">{p.description}</p>
                </div>
                <Badge variant={p.active ? "success" : "default"}>
                  {p.active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 pt-4 text-xs">
                <div>
                  <p className="text-muted">Student Limit</p>
                  <p className="text-foreground font-semibold">{p.maxStudents}</p>
                </div>
                <div>
                  <p className="text-muted">Staff Limit</p>
                  <p className="text-foreground font-semibold">{p.maxStaff}</p>
                </div>
                <div>
                  <p className="text-muted">Storage</p>
                  <p className="text-foreground font-semibold">{p.storageLimitMb} MB</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Create Plan &amp; Feature Limits</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              role="alert"
              className="bg-danger-soft text-danger mb-4 flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3.5">
            <Input
              label="Plan Name"
              placeholder="e.g. Growth Campus"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Textarea
              label="Description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Monthly Ref (₹)"
                type="number"
                min="0"
                value={monthlyDisplayRupees}
                onChange={(e) => setMonthlyDisplayRupees(e.target.value)}
              />
              <Input
                label="Yearly Ref (₹)"
                type="number"
                min="0"
                value={yearlyDisplayRupees}
                onChange={(e) => setYearlyDisplayRupees(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Students"
                type="number"
                min="1"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
              />
              <Input
                label="Staff"
                type="number"
                min="1"
                value={maxStaff}
                onChange={(e) => setMaxStaff(e.target.value)}
              />
              <Input
                label="Storage (MB)"
                type="number"
                min="50"
                value={storageLimitMb}
                onChange={(e) => setStorageLimitMb(e.target.value)}
              />
            </div>
            <Button type="submit" fullWidth loading={loading}>
              Save Plan
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
