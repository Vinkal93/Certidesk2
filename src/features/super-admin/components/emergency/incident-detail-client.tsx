"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, UserCheck } from "lucide-react";
import { useActionFeedback } from "@/components/ui/action-feedback-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  INCIDENT_TRANSITIONS,
  type EnterpriseIncidentSeverity,
  type EnterpriseIncidentStatus,
  type IncidentCommentRecord,
  type IncidentRecord,
} from "@/types/emergency";
import { formatEmergencyDate } from "./emergency-shared";

interface Props {
  initialIncident: IncidentRecord;
  initialComments: IncidentCommentRecord[];
  allIncidents: IncidentRecord[];
  operators: Array<{ uid: string; email: string; displayName: string }>;
}

export function IncidentDetailClient({
  initialIncident,
  initialComments,
  allIncidents,
  operators,
}: Props) {
  const router = useRouter();
  const { confirm, runWithBanner } = useActionFeedback();
  const [incident, setIncident] = useState<IncidentRecord>(initialIncident);
  const [comments, setComments] = useState<IncidentCommentRecord[]>(initialComments);
  const [commentBody, setCommentBody] = useState("");
  const [commentType, setCommentType] = useState<"comment" | "evidence">("comment");
  const [relatedId, setRelatedId] = useState(allIncidents[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/su/emergency/incidents/${incident.id}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as {
      data?: { incident: IncidentRecord; comments: IncidentCommentRecord[] };
    };
    if (res.ok && json.data) {
      setIncident(json.data.incident);
      setComments(json.data.comments);
    }
    router.refresh();
  }

  async function runPatch(payload: Record<string, unknown>, label: string) {
    setError(null);
    try {
      await runWithBanner({
        title: label,
        successTitle: "Incident updated",
        tone: "info",
        task: async () => {
          const res = await fetch(`/api/su/emergency/incidents/${incident.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to update incident.");
          }
          await refresh();
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update incident.");
    }
  }

  async function handleTransition(nextStatus: EnterpriseIncidentStatus) {
    const resConfirm = await confirm({
      title: `Transition incident to "${nextStatus}"?`,
      description:
        nextStatus === "resolved"
          ? "Provide a resolution summary for the post-incident record."
          : `Updates status from ${incident.status} to ${nextStatus}.`,
      confirmLabel: `Move to ${nextStatus}`,
      tone: nextStatus === "resolved" ? "info" : "warning",
      requireReason: nextStatus === "resolved" || incident.status === "closed",
      reasonLabel: nextStatus === "resolved" ? "Resolution Summary" : "Justification",
    });
    if (!resConfirm.confirmed) return;

    await runPatch(
      {
        action: "transition_status",
        status: nextStatus,
        ...(nextStatus === "resolved" && resConfirm.reason
          ? { resolutionSummary: resConfirm.reason }
          : {}),
        ...(resConfirm.reason ? { reason: resConfirm.reason } : {}),
      },
      `Updating status to ${nextStatus}`
    );
  }

  const allowedTransitions = INCIDENT_TRANSITIONS[incident.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/su/emergency/incidents"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Incidents
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {allowedTransitions.map((nextStatus) => (
            <Button
              key={nextStatus}
              type="button"
              size="sm"
              variant={nextStatus === "resolved" ? "primary" : "outline"}
              onClick={() => void handleTransition(nextStatus)}
            >
              Move to {nextStatus}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    incident.severity === "critical"
                      ? "danger"
                      : incident.severity === "high"
                        ? "warning"
                        : "outline"
                  }
                >
                  {incident.severity.toUpperCase()}
                </Badge>
                <Badge
                  variant={
                    incident.status === "resolved" || incident.status === "closed"
                      ? "success"
                      : "primary"
                  }
                >
                  {incident.status}
                </Badge>
                <span className="text-muted font-mono text-xs">{incident.id}</span>
              </div>
              <CardTitle className="text-xl">{incident.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted text-xs font-semibold uppercase">Description</p>
                <p className="text-foreground mt-1">{incident.description}</p>
              </div>
              {incident.impactDescription && (
                <div>
                  <p className="text-muted text-xs font-semibold uppercase">Impact</p>
                  <p className="text-foreground mt-1">{incident.impactDescription}</p>
                </div>
              )}
              {incident.resolutionSummary && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <span className="font-semibold">Resolution Summary: </span>
                  {incident.resolutionSummary}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline & Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Incident Timeline &amp; Evidence ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="border-border rounded-lg border p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{c.type}</Badge>
                      <span className="text-muted font-mono">
                        {formatEmergencyDate(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-foreground mt-2">{c.body}</p>
                    <p className="text-muted mt-1 text-[11px]">
                      Actor: {c.actorEmail ?? c.actorUid}
                    </p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!commentBody.trim()) return;
                  void runPatch(
                    {
                      action: "add_comment",
                      comment: commentBody,
                      commentType,
                    },
                    "Adding timeline entry"
                  ).then(() => setCommentBody(""));
                }}
                className="border-border space-y-3 border-t pt-4"
              >
                <div className="flex gap-2">
                  <select
                    value={commentType}
                    onChange={(e) =>
                      setCommentType(e.target.value as "comment" | "evidence")
                    }
                    className="border-border bg-card text-foreground h-9 rounded-lg border px-2.5 text-xs"
                  >
                    <option value="comment">Internal Note</option>
                    <option value="evidence">Supporting Evidence</option>
                  </select>
                  <Input
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add investigation note, log excerpt, or evidence..."
                  />
                  <Button type="submit" size="sm" variant="primary">
                    Post
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Metadata & Controls Sidebar */}
        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Metadata &amp; Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Category</span>
                <span className="text-foreground font-medium">{incident.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Detection Source</span>
                <span className="text-foreground font-medium">
                  {incident.detectionSource}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Created</span>
                <span className="text-foreground font-mono">
                  {formatEmergencyDate(incident.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Acknowledged</span>
                <span className="text-foreground font-mono">
                  {formatEmergencyDate(incident.acknowledgedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Resolved</span>
                <span className="text-foreground font-mono">
                  {formatEmergencyDate(incident.resolvedAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserCheck className="h-4 w-4" />
                Assignment &amp; Severity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="text-muted mb-1 block">Assigned Operator</label>
                <select
                  value={incident.assignedToUid ?? ""}
                  onChange={(e) =>
                    void runPatch(
                      { action: "assign", assignedToUid: e.target.value },
                      "Reassigning incident"
                    )
                  }
                  className="border-border bg-card text-foreground h-9 w-full rounded-lg border px-2.5 text-xs"
                >
                  <option value="">Unassigned</option>
                  {operators.map((op) => (
                    <option key={op.uid} value={op.uid}>
                      {op.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-muted mb-1 block">Severity Level</label>
                <select
                  value={incident.severity}
                  onChange={(e) =>
                    void runPatch(
                      {
                        action: "change_severity",
                        severity: e.target.value as EnterpriseIncidentSeverity,
                      },
                      "Updating severity"
                    )
                  }
                  className="border-border bg-card text-foreground h-9 w-full rounded-lg border px-2.5 text-xs"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Informational</option>
                </select>
              </div>

              {allIncidents.length > 0 && (
                <div>
                  <label className="text-muted mb-1 block">Link Related Incident</label>
                  <div className="flex gap-2">
                    <select
                      value={relatedId}
                      onChange={(e) => setRelatedId(e.target.value)}
                      className="border-border bg-card text-foreground h-9 flex-1 rounded-lg border px-2 text-xs"
                    >
                      {allIncidents.map((other) => (
                        <option key={other.id} value={other.id}>
                          {other.id} — {other.title}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void runPatch(
                          { action: "link_incident", relatedIncidentId: relatedId },
                          "Linking incident"
                        )
                      }
                    >
                      Link
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
