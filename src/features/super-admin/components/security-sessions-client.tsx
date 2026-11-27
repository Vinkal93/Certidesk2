"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Lock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionFeedback } from "@/components/ui/action-feedback-provider";
import type { SecurityPolicyConfig, SecuritySessionRecord } from "@/types/security";

export interface ManageableSecurityUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  instituteId: string;
  updatedAt: string;
}

export function SecuritySessionsClient({
  users,
  initialSessions = [],
  initialPolicy,
  currentUid,
}: {
  users: ManageableSecurityUser[];
  initialSessions?: SecuritySessionRecord[];
  initialPolicy?: SecurityPolicyConfig;
  currentUid: string;
}) {
  const router = useRouter();
  const { confirm } = useActionFeedback();
  const [sessions, setSessions] = React.useState(initialSessions);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [lifetimeDays, setLifetimeDays] = React.useState(
    String(initialPolicy?.sessionLifetimeDays ?? 5)
  );
  const [idleMinutes, setIdleMinutes] = React.useState(
    String(initialPolicy?.idleTimeoutMinutes ?? 60)
  );
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [savingPolicy, setSavingPolicy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const filteredSessions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (q) {
        return (
          (s.email ?? "").toLowerCase().includes(q) ||
          s.userId.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sessions, statusFilter, search]);

  const handleRevokeSession = async (session: SecuritySessionRecord) => {
    const confirmation = await confirm({
      title: `Revoke Session ${session.id}`,
      description: `Immediately invalidate session for ${session.email ?? session.userId} and revoke Firebase refresh tokens.`,
      confirmLabel: "Revoke Session",
      tone: "destructive",
      requireReason: true,
      reasonPlaceholder: "Enter security reason (e.g. suspected compromise)",
    });
    if (!confirmation.confirmed) return;
    const reason = confirmation.reason;

    setRevokingId(session.id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/su/security/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_session",
          sessionId: session.id,
          reason,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { session: SecuritySessionRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to revoke session.");
        return;
      }
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? json.data!.session : s))
      );
      setMessage(`Session ${session.id} revoked and enforced server-side.`);
      router.refresh();
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeUser = async (user: ManageableSecurityUser) => {
    const confirmation = await confirm({
      title: `Revoke All Sessions — ${user.email}`,
      description:
        "Revoke all active sessions and Firebase refresh tokens for this account.",
      confirmLabel: "Revoke All",
      tone: "destructive",
      requireReason: true,
    });
    if (!confirmation.confirmed) return;
    const reason = confirmation.reason;

    setRevokingId(user.uid);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/su/security/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_user",
          targetUid: user.uid,
          reason,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to revoke user sessions.");
        return;
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.userId === user.uid && s.status === "active" ? { ...s, status: "revoked" } : s
        )
      );
      setMessage(`All sessions revoked for ${user.email}.`);
      router.refresh();
    } finally {
      setRevokingId(null);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/su/security/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_policy",
          sessionLifetimeDays: Number(lifetimeDays),
          idleTimeoutMinutes: Number(idleMinutes),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to update session policy.");
        return;
      }
      setMessage("Session lifetime & idle timeout policy updated.");
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Session Policy Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="text-primary h-4 w-4" aria-hidden="true" />
            Server Session Lifetime &amp; Idle Timeout Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePolicy} className="flex flex-wrap items-end gap-4">
            <div className="w-44">
              <Input
                label="Max Lifetime (Days)"
                type="number"
                value={lifetimeDays}
                onChange={(e) => setLifetimeDays(e.target.value)}
              />
            </div>
            <div className="w-44">
              <Input
                label="Idle Timeout (Minutes)"
                type="number"
                value={idleMinutes}
                onChange={(e) => setIdleMinutes(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" loading={savingPolicy}>
              Save Policy
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Session Inventory */}
      <Card>
        <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle className="text-base">
            Server-Tracked Sessions ({filteredSessions.length})
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search
                className="text-muted absolute top-2.5 left-2.5 h-3.5 w-3.5"
                aria-hidden="true"
              />
              <Input
                placeholder="Search session or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-xs"
              />
            </div>
            <select
              aria-label="Session status filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-border bg-background h-9 rounded-lg border px-2.5 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSessions.length === 0 ? (
            <p className="text-muted p-6 text-center text-sm">
              No tracked sessions match your filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-border bg-surface text-muted border-b">
                  <tr>
                    <th className="px-4 py-2.5">Session ID</th>
                    <th className="px-4 py-2.5">Account</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Last Verified</th>
                    <th className="px-4 py-2.5">IP</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {filteredSessions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2.5 font-mono">{s.id}</td>
                      <td className="px-4 py-2.5">{s.email ?? s.userId}</td>
                      <td className="px-4 py-2.5">{s.role}</td>
                      <td className="text-muted px-4 py-2.5 font-mono">
                        {s.lastVerifiedAt.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="text-muted px-4 py-2.5 font-mono">
                        {s.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={
                            s.status === "active"
                              ? "success"
                              : s.status === "revoked"
                                ? "danger"
                                : "outline"
                          }
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {s.status === "active" && s.userId !== currentUid && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            loading={revokingId === s.id}
                            onClick={() => handleRevokeSession(s)}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account-Level Revocation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Account-Wide Token Revocation ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-border divide-y">
            {users.slice(0, 30).map((u) => (
              <div
                key={u.uid}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs"
              >
                <div>
                  <p className="font-semibold">
                    {u.name} <span className="text-muted font-mono">({u.email})</span>
                  </p>
                  <p className="text-muted">
                    {u.role} {u.instituteId ? `· ${u.instituteId}` : ""}
                  </p>
                </div>
                {u.uid !== currentUid ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={revokingId === u.uid}
                    onClick={() => handleRevokeUser(u)}
                  >
                    Revoke All Sessions
                  </Button>
                ) : (
                  <Badge variant="outline">Current Session</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
