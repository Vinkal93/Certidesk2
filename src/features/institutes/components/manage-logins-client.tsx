"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, KeyRound, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { InstituteLoginMember } from "@/services/institute-logins.service";

interface Props {
  initialMembers: InstituteLoginMember[];
}

export function ManageLoginsClient({ initialMembers }: Props) {
  const router = useRouter();
  const [members, setMembers] = React.useState<InstituteLoginMember[]>(initialMembers);
  const [roleFilter, setRoleFilter] = React.useState<"all" | "student" | "staff">("all");
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<InstituteLoginMember | null>(null);
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [requireChange, setRequireChange] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (q) {
        return (
          m.displayName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.studentCode ?? "").toLowerCase().includes(q) ||
          (m.phone ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, roleFilter, search]);

  async function refreshList() {
    const res = await fetch("/api/institute/logins");
    const json = (await res.json()) as { data?: { members?: InstituteLoginMember[] } };
    if (res.ok && json.data?.members) {
      setMembers(json.data.members);
    }
    router.refresh();
  }

  function openEditModal(member: InstituteLoginMember) {
    setEditing(member);
    setNewEmail(member.email);
    setNewPassword("");
    setRequireChange(false);
    setError(null);
  }

  async function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload: Record<string, unknown> = { uid: editing.uid };
      if (newEmail.trim().toLowerCase() !== editing.email.toLowerCase()) {
        payload.newEmail = newEmail.trim();
      }
      if (newPassword.trim()) {
        payload.newPassword = newPassword.trim();
        payload.requireChangeOnNextLogin = requireChange;
      }

      const res = await fetch("/api/institute/logins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to update credentials.");
        setSaving(false);
        return;
      }

      setNotice(
        `Login credentials updated for ${editing.displayName}. They can now sign in with the updated credentials.`
      );
      setEditing(null);
      await refreshList();
    } catch {
      setError("Network error while updating credentials.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(member: InstituteLoginMember) {
    setError(null);
    setNotice(null);
    const nextDisabled = !member.disabled;
    const res = await fetch("/api/institute/logins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: member.uid, disabled: nextDisabled }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      setError(json.error?.message ?? "Failed to update login status.");
      return;
    }
    setNotice(
      `${member.displayName} login access ${nextDisabled ? "disabled" : "re-enabled"}.`
    );
    await refreshList();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-danger-soft text-danger border-danger/30 rounded-xl border p-3 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">
              Student &amp; Staff Login Accounts ({filtered.length})
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: `All (${members.length})` },
                  {
                    id: "student",
                    label: `Students (${members.filter((m) => m.role === "student").length})`,
                  },
                  {
                    id: "staff",
                    label: `Staff (${members.filter((m) => m.role === "staff").length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    roleFilter === tab.id
                      ? "bg-primary text-white"
                      : "bg-surface text-muted hover:text-foreground border-border border"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search
              className="text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, student ID, or phone..."
              className="pl-9"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-border bg-surface text-muted border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Login Identifiers</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filtered.map((m) => (
                  <tr key={m.uid} className="hover:bg-surface/60 transition">
                    <td className="px-4 py-3">
                      <p className="text-foreground font-semibold">{m.displayName}</p>
                      {m.studentCode && (
                        <p className="text-muted text-xs">ID: {m.studentCode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={m.role === "staff" ? "warning" : "primary"}>
                        {m.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-foreground font-medium">{m.email}</p>
                      {m.phone && <p className="text-muted">{m.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {m.disabled ? (
                        <Badge variant="danger">Disabled</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(m)}
                        >
                          <KeyRound className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          Manage Login / Password
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(m)}
                        >
                          {m.disabled ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                              Enable
                            </>
                          ) : (
                            <>
                              <Ban className="text-warning mr-1 h-3.5 w-3.5" />
                              Disable
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted px-4 py-8 text-center text-sm">
                      No login accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Login & Reset Password Modal */}
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-login-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="border-border bg-background w-full max-w-md rounded-2xl border p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="edit-login-title" className="text-foreground text-base font-bold">
                  Manage Credentials — {editing.displayName}
                </h2>
                <p className="text-muted text-xs">
                  {editing.role.toUpperCase()}
                  {editing.studentCode ? ` • ${editing.studentCode}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setEditing(null)}
                className="text-muted hover:text-foreground cursor-pointer rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="mt-4 space-y-4">
              {error && (
                <p className="bg-danger-soft text-danger rounded-lg p-2.5 text-xs">
                  {error}
                </p>
              )}

              <div>
                <label className="text-foreground mb-1 block text-xs font-semibold">
                  Login Email Address
                </label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-foreground mb-1 block text-xs font-semibold">
                  New Password (min 6 characters, leave blank to keep current)
                </label>
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new login password..."
                  minLength={6}
                />
              </div>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={requireChange}
                  onChange={(e) => setRequireChange(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-muted">Require password change on next login</span>
              </label>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Login Credentials"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
