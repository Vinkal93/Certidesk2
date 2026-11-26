"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  IncidentSeverity,
  IncidentStatus,
  PlatformIncidentRecord,
} from "@/services/emergency.service";

interface Props {
  initialIncidents: PlatformIncidentRecord[];
}

export function IncidentsClient({ initialIncidents }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("sev2");
  const [components, setComponents] = useState("payments, webhooks");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/su/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          severity,
          affectedComponents: components
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? "Failed to create incident.");
      }
      setTitle("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create incident.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate(id: string, status: IncidentStatus) {
    const resolutionSummary =
      status === "resolved"
        ? window.prompt("Resolution summary:") ?? "Resolved by Super Admin"
        : undefined;
    const res = await fetch("/api/su/incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, resolutionSummary }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: { message?: string } };
      setError(json.error?.message ?? "Failed to update incident.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Declare Platform Incident
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Incident Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Razorpay webhook delivery delay"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Severity
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
              >
                <option value="sev1">SEV-1 (Critical Outage)</option>
                <option value="sev2">SEV-2 (Major Degradation)</option>
                <option value="sev3">SEV-3 (Partial Impact)</option>
                <option value="sev4">SEV-4 (Minor / Informational)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summary of impact and initial investigation findings"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Affected Components (comma-separated)
              </label>
              <Input
                value={components}
                onChange={(e) => setComponents(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Recording..." : "Create Incident"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incident Log ({initialIncidents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialIncidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incidents recorded.</p>
          ) : (
            initialIncidents.map((inc) => (
              <div
                key={inc.id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{inc.id}</span>
                    <Badge variant={inc.severity === "sev1" ? "danger" : "warning"}>
                      {inc.severity.toUpperCase()}
                    </Badge>
                    <Badge variant={inc.status === "resolved" ? "default" : "outline"}>
                      {inc.status}
                    </Badge>
                  </div>
                  <p className="font-medium">{inc.title}</p>
                  <p className="text-xs text-muted-foreground">{inc.description}</p>
                  {inc.resolutionSummary && (
                    <p className="text-xs text-emerald-600">
                      Resolution: {inc.resolutionSummary}
                    </p>
                  )}
                </div>
                {inc.status !== "resolved" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(inc.id, "monitoring")}
                    >
                      Mark Monitoring
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(inc.id, "resolved")}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
