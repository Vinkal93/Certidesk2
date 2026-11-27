"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Lock, Shield, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserPermissionOverrideRecord } from "@/types/security";

export function SecurityAccessControlClient({
  roles,
  permissions,
  initialOverrides,
  users,
}: {
  roles: Array<{
    role: string;
    label: string;
    scope: string;
    description: string;
    defaultPermissions: string[];
  }>;
  permissions: ReadonlyArray<{ group: string; key: string; label: string }>;
  initialOverrides: UserPermissionOverrideRecord[];
  users: Array<{
    uid: string;
    email: string;
    displayName: string;
    role: string;
    instituteId: string | null;
  }>;
}) {
  const [overrides, setOverrides] = React.useState(initialOverrides);
  const [targetUid, setTargetUid] = React.useState(
    users.find((u) => u.role !== "super_admin")?.uid ?? ""
  );
  const [grantedText, setGrantedText] = React.useState("");
  const [revokedText, setRevokedText] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const grantedPermissions = grantedText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const revokedPermissions = revokedText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/su/security/access-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUid,
          grantedPermissions,
          revokedPermissions,
          reason,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { override: UserPermissionOverrideRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to save permission override.");
        return;
      }
      const saved = json.data.override;
      setOverrides((prev) => [saved, ...prev.filter((o) => o.uid !== saved.uid)]);
      setMessage(`Permission override saved for ${saved.email}.`);
      setReason("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Role Directory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="text-primary h-4 w-4" aria-hidden="true" />
            System Role Directory &amp; Isolation Boundaries
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <div key={r.role} className="border-border rounded-xl border p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm font-semibold">{r.label}</span>
                <Badge variant={r.role === "super_admin" ? "navy" : "outline"}>
                  {r.scope}
                </Badge>
              </div>
              <p className="text-muted mt-1.5">{r.description}</p>
              <p className="text-muted mt-2 font-mono text-[11px]">
                Defaults: {r.defaultPermissions.slice(0, 4).join(", ")}
                {r.defaultPermissions.length > 4
                  ? ` +${r.defaultPermissions.length - 4} more`
                  : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="text-primary h-4 w-4" aria-hidden="true" />
            Permission Matrix ({permissions.length} definitions)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-border bg-surface text-muted border-b">
                <tr>
                  <th className="px-4 py-2.5">Module</th>
                  <th className="px-4 py-2.5">Permission Key</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Super Admin</th>
                  <th className="px-4 py-2.5">Institute Admin</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {permissions.map((p) => (
                  <tr key={p.key}>
                    <td className="px-4 py-2 font-medium">{p.group}</td>
                    <td className="px-4 py-2 font-mono">{p.key}</td>
                    <td className="text-muted px-4 py-2">{p.label}</td>
                    <td className="px-4 py-2">
                      <Badge variant="success">Allowed</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {p.group.startsWith("Platform") ? (
                        <Badge variant="danger">Denied</Badge>
                      ) : (
                        <Badge variant="outline">Tenant Scoped</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User-Specific Overrides */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="text-primary h-4 w-4" aria-hidden="true" />
              User Permission Override (Step-Up Auth)
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
            <form onSubmit={handleSaveOverride} className="space-y-3">
              <div>
                <label className="text-foreground mb-1 block text-xs font-medium">
                  Target User (Non-Super-Admin)
                </label>
                <select
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  className="border-border bg-background h-10 w-full rounded-lg border px-3 text-xs"
                >
                  {users
                    .filter((u) => u.role !== "super_admin")
                    .map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.email} ({u.role})
                      </option>
                    ))}
                </select>
              </div>
              <Input
                label="Grant Permissions (comma-separated)"
                placeholder="e.g. reports:read, wallet:read"
                value={grantedText}
                onChange={(e) => setGrantedText(e.target.value)}
              />
              <Input
                label="Revoke Permissions (comma-separated)"
                placeholder="e.g. certificates:issue"
                value={revokedText}
                onChange={(e) => setRevokedText(e.target.value)}
              />
              <Input
                label="Audit Reason"
                placeholder="Required justification"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              <Button type="submit" size="sm" loading={loading}>
                Save Override
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">
              Active Permission Overrides ({overrides.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {overrides.length === 0 ? (
              <p className="text-muted p-6 text-center text-sm">
                No user-specific permission overrides configured.
              </p>
            ) : (
              <div className="divide-border divide-y">
                {overrides.map((ov) => (
                  <div key={ov.uid} className="space-y-1 px-5 py-3 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold">{ov.email}</span>
                      <Badge variant="outline">{ov.role}</Badge>
                    </div>
                    <p className="text-muted">
                      Granted: {ov.grantedPermissions.join(", ") || "None"} · Revoked:{" "}
                      {ov.revokedPermissions.join(", ") || "None"}
                    </p>
                    <p className="text-muted">Reason: {ov.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
