"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  History,
  LogOut,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  PlatformUserKpis,
  PlatformUserSummary,
  UserControlAction,
} from "@/services/su-users.service";
import type { UserRole } from "@/types/auth";
import type { SecurityLoginEventRecord, SecuritySessionRecord } from "@/types/security";

interface Props {
  initialUsers: PlatformUserSummary[];
  institutes: { id: string; name: string; code: string }[];
  kpis: PlatformUserKpis;
  currentUid: string;
}

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | "active" | "blocked";
type SortField = "newest" | "oldest" | "name" | "last_login";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  institute_admin: "Institute Admin",
  staff: "Staff",
  student: "Student",
};

const ROLE_BADGE_VARIANT: Record<UserRole, "navy" | "primary" | "warning" | "outline"> = {
  super_admin: "navy",
  institute_admin: "primary",
  staff: "warning",
  student: "outline",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AllUsersClient({
  initialUsers,
  institutes,
  kpis: initialKpis,
  currentUid,
}: Props) {
  const router = useRouter();
  const [users, setUsers] = React.useState<PlatformUserSummary[]>(initialUsers);
  const [kpis, setKpis] = React.useState<PlatformUserKpis>(initialKpis);

  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("all");
  const [instituteFilter, setInstituteFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortField>("newest");

  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // Custom confirmation modal state
  const [confirmState, setConfirmState] = React.useState<{
    user: PlatformUserSummary;
    action: UserControlAction;
  } | null>(null);
  const [actionReason, setActionReason] = React.useState("");
  const [submittingAction, setSubmittingAction] = React.useState(false);

  // Login history modal state
  const [historyUser, setHistoryUser] = React.useState<PlatformUserSummary | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyEvents, setHistoryEvents] = React.useState<SecurityLoginEventRecord[]>(
    []
  );
  const [historySessions, setHistorySessions] = React.useState<SecuritySessionRecord[]>(
    []
  );

  const filteredUsers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (instituteFilter !== "all") {
        if (instituteFilter === "platform") {
          if (u.instituteId !== null) return false;
        } else if (u.instituteId !== instituteFilter) {
          return false;
        }
      }
      if (statusFilter === "active" && u.disabled) return false;
      if (statusFilter === "blocked" && !u.disabled) return false;
      if (q) {
        const match =
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.uid.toLowerCase().includes(q) ||
          (u.instituteName ?? "").toLowerCase().includes(q) ||
          (u.instituteCode ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === "name") return a.displayName.localeCompare(b.displayName);
      if (sortBy === "last_login") {
        return (b.lastLoginAt ?? "").localeCompare(a.lastLoginAt ?? "");
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [users, roleFilter, instituteFilter, statusFilter, search, sortBy]);

  async function refreshUsers() {
    const res = await fetch("/api/su/users");
    const json = (await res.json()) as {
      data?: { users: PlatformUserSummary[]; kpis: PlatformUserKpis };
    };
    if (res.ok && json.data) {
      setUsers(json.data.users);
      setKpis(json.data.kpis);
    }
    router.refresh();
  }

  async function openLoginHistory(u: PlatformUserSummary) {
    setHistoryUser(u);
    setHistoryLoading(true);
    setHistoryEvents([]);
    setHistorySessions([]);
    setError(null);
    try {
      const res = await fetch(`/api/su/users/${encodeURIComponent(u.uid)}`);
      const json = (await res.json()) as {
        data?: {
          events: SecurityLoginEventRecord[];
          sessions: SecuritySessionRecord[];
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        setError(json.error?.message ?? "Failed to load login history.");
        setHistoryLoading(false);
        return;
      }
      setHistoryEvents(json.data.events);
      setHistorySessions(json.data.sessions);
    } catch {
      setError("Network error while loading login history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleConfirmAction(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmState) return;
    setSubmittingAction(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(
        `/api/su/users/${encodeURIComponent(confirmState.user.uid)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: confirmState.action,
            reason: actionReason.trim() || undefined,
          }),
        }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to apply user action.");
        setSubmittingAction(false);
        return;
      }

      const labelMap: Record<UserControlAction, string> = {
        block: "blocked and active sessions revoked",
        unblock: "unblocked and restored",
        force_logout: "logged out across all active sessions",
        delete: "permanently deleted",
      };
      setNotice(
        `${confirmState.user.displayName} (${confirmState.user.email}) has been ${labelMap[confirmState.action]}.`
      );
      setConfirmState(null);
      setActionReason("");
      await refreshUsers();
    } catch {
      setError("Network error while performing user action.");
    } finally {
      setSubmittingAction(false);
    }
  }

  const actionMeta: Record<
    UserControlAction,
    {
      title: string;
      description: string;
      buttonLabel: string;
      variant: "destructive" | "primary";
    }
  > = {
    block: {
      title: "Block User Access",
      description:
        "This immediately disables Firebase Authentication, blocks portal login, and revokes active refresh tokens.",
      buttonLabel: "Confirm Block",
      variant: "destructive",
    },
    unblock: {
      title: "Unblock User Access",
      description:
        "Restores Firebase Authentication and login mapping access for this user.",
      buttonLabel: "Confirm Unblock",
      variant: "primary",
    },
    force_logout: {
      title: "Force Logout User",
      description:
        "Revokes all active refresh tokens and marks active portal sessions as revoked. The user must sign in again.",
      buttonLabel: "Revoke All Sessions",
      variant: "primary",
    },
    delete: {
      title: "Delete User Account",
      description:
        "Permanently removes this user from Firebase Auth, login mappings, and user directory. Audit logs and financial records remain intact.",
      buttonLabel: "Permanently Delete User",
      variant: "destructive",
    },
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs font-medium">Total Users</p>
            <p className="text-foreground mt-1 text-2xl font-bold">{kpis.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs font-medium">Active</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {kpis.activeUsers}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs font-medium">Blocked</p>
            <p className="text-danger mt-1 text-2xl font-bold">{kpis.blockedUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs font-medium">Institute Admins</p>
            <p className="text-foreground mt-1 text-2xl font-bold">
              {kpis.instituteAdmins}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs font-medium">Staff</p>
            <p className="text-foreground mt-1 text-2xl font-bold">{kpis.staff}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs font-medium">Students</p>
            <p className="text-foreground mt-1 text-2xl font-bold">{kpis.students}</p>
          </CardContent>
        </Card>
      </div>

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

      {/* Filters & Category Pills */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="text-primary h-4 w-4" aria-hidden="true" />
              Directory Filters
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: `All (${kpis.totalUsers})` },
                  {
                    id: "institute_admin",
                    label: `Institute Admins (${kpis.instituteAdmins})`,
                  },
                  { id: "staff", label: `Staff (${kpis.staff})` },
                  { id: "student", label: `Students (${kpis.students})` },
                  { id: "super_admin", label: `Super Admins (${kpis.superAdmins})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    roleFilter === tab.id
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface text-muted hover:text-foreground border-border border"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search
                className="text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, UID, or institute..."
                className="pl-9"
              />
            </div>

            <select
              aria-label="Filter by institute"
              value={instituteFilter}
              onChange={(e) => setInstituteFilter(e.target.value)}
              className="border-border bg-background text-foreground h-10 rounded-lg border px-3 text-sm"
            >
              <option value="all">All Institutes</option>
              <option value="platform">Platform Level (No Institute)</option>
              {institutes.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.code})
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="border-border bg-background text-foreground h-10 flex-1 rounded-lg border px-3 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="blocked">Blocked Only</option>
              </select>

              <select
                aria-label="Sort users"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="border-border bg-background text-foreground h-10 flex-1 rounded-lg border px-3 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="last_login">Recent Login</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-border bg-surface text-muted border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Institute</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Last Login</th>
                  <th className="px-4 py-3 text-right font-semibold">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filteredUsers.map((u) => {
                  const isSelf = u.uid === currentUid;
                  return (
                    <tr key={u.uid} className="hover:bg-surface/60 transition">
                      <td className="px-4 py-3">
                        <p className="text-foreground font-semibold">{u.displayName}</p>
                        <p className="text-muted text-xs">{u.email}</p>
                        <p className="text-muted font-mono text-[10px]">{u.uid}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ROLE_BADGE_VARIANT[u.role]}>
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.instituteName ? (
                          <div>
                            <p className="text-foreground text-xs font-medium">
                              {u.instituteName}
                            </p>
                            <p className="text-muted font-mono text-[11px]">
                              {u.instituteCode}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted text-xs">Platform</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.disabled ? (
                          <Badge variant="danger">Blocked</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-foreground">{formatDateTime(u.lastLoginAt)}</p>
                        {u.lastLoginStatus && (
                          <p className="text-muted capitalize">{u.lastLoginStatus}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openLoginHistory(u)}
                            title="View Login History & Sessions"
                          >
                            <History className="mr-1 h-3.5 w-3.5" />
                            History
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            onClick={() => {
                              setConfirmState({ user: u, action: "force_logout" });
                              setActionReason("");
                            }}
                            title="Revoke all sessions (Force Logout)"
                          >
                            <LogOut className="mr-1 h-3.5 w-3.5" />
                            Logout
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            onClick={() => {
                              setConfirmState({
                                user: u,
                                action: u.disabled ? "unblock" : "block",
                              });
                              setActionReason("");
                            }}
                          >
                            {u.disabled ? (
                              <>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                Unblock
                              </>
                            ) : (
                              <>
                                <Ban className="text-warning mr-1 h-3.5 w-3.5" />
                                Block
                              </>
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSelf || u.role === "super_admin"}
                            onClick={() => {
                              setConfirmState({ user: u, action: "delete" });
                              setActionReason("");
                            }}
                            className="text-danger hover:bg-danger-soft"
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted px-4 py-10 text-center text-sm">
                      No users match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-border text-muted flex items-center justify-between border-t px-4 py-3 text-xs">
            <span>
              Showing {filteredUsers.length} of {users.length} total platform users
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Custom Confirmation Modal */}
      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-user-action-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="border-border bg-background w-full max-w-md rounded-2xl border p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-danger-soft text-danger flex h-9 w-9 items-center justify-center rounded-xl">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="confirm-user-action-title"
                    className="text-foreground text-base font-bold"
                  >
                    {actionMeta[confirmState.action].title}
                  </h2>
                  <p className="text-muted text-xs">{confirmState.user.email}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setConfirmState(null)}
                className="text-muted hover:text-foreground cursor-pointer rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-muted mt-3 text-sm leading-relaxed">
              {actionMeta[confirmState.action].description}
            </p>

            <form onSubmit={handleConfirmAction} className="mt-4 space-y-4">
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-semibold">
                  Audit Reason (optional)
                </label>
                <Input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Policy violation, requested reset, suspicious login..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submittingAction}
                  onClick={() => setConfirmState(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={actionMeta[confirmState.action].variant}
                  disabled={submittingAction}
                >
                  {submittingAction
                    ? "Processing..."
                    : actionMeta[confirmState.action].buttonLabel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login History & Active Sessions Modal */}
      {historyUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-history-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="border-border bg-background flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl">
            <div className="border-border flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2
                  id="user-history-title"
                  className="text-foreground text-base font-bold"
                >
                  Login History &amp; Sessions — {historyUser.displayName}
                </h2>
                <p className="text-muted text-xs">
                  {historyUser.email} &bull; {ROLE_LABELS[historyUser.role]}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close history modal"
                onClick={() => setHistoryUser(null)}
                className="text-muted hover:text-foreground cursor-pointer rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {historyLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : (
                <>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-foreground text-xs font-semibold uppercase">
                        Tracked Sessions ({historySessions.length})
                      </h3>
                      {historyUser.uid !== currentUid && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const target = historyUser;
                            setHistoryUser(null);
                            setConfirmState({ user: target, action: "force_logout" });
                          }}
                        >
                          <LogOut className="mr-1 h-3.5 w-3.5" />
                          Force Logout All
                        </Button>
                      )}
                    </div>
                    {historySessions.length === 0 ? (
                      <p className="text-muted text-xs">
                        No tracked session records found for this user.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {historySessions.map((s) => (
                          <div
                            key={s.id}
                            className="border-border bg-surface flex items-center justify-between rounded-xl border px-3 py-2 text-xs"
                          >
                            <div>
                              <p className="text-foreground font-medium">
                                {s.userAgent || "Web Session"}
                              </p>
                              <p className="text-muted">
                                IP: {s.ipAddress || "—"} &bull; Last verified:{" "}
                                {formatDateTime(s.lastVerifiedAt)}
                              </p>
                            </div>
                            <Badge
                              variant={s.status === "active" ? "success" : "outline"}
                            >
                              {s.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-foreground mb-2 text-xs font-semibold uppercase">
                      Recent Login Events ({historyEvents.length})
                    </h3>
                    {historyEvents.length === 0 ? (
                      <p className="text-muted text-xs">
                        No login events recorded yet for this user.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {historyEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="border-border flex items-center justify-between rounded-xl border px-3 py-2 text-xs"
                          >
                            <div>
                              <p className="text-foreground font-medium">
                                {formatDateTime(ev.timestamp)} &bull; {ev.authMethod}
                              </p>
                              <p className="text-muted">
                                IP: {ev.ipAddress || "—"}
                                {ev.failureCategory ? ` • ${ev.failureCategory}` : ""}
                              </p>
                            </div>
                            <Badge
                              variant={
                                ev.result === "success"
                                  ? "success"
                                  : ev.result === "blocked"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {ev.result}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
