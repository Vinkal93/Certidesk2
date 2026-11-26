"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StaffPermission } from "@/types/auth";
import type { UserProfileRecord } from "@/types/domain";

const AVAILABLE_PERMISSIONS: { value: StaffPermission; label: string }[] = [
  { value: "students:read", label: "View Students" },
  { value: "students:write", label: "Admit & Edit Students" },
  { value: "courses:read", label: "View Courses" },
  { value: "courses:write", label: "Manage Courses" },
  { value: "batches:read", label: "View Batches" },
  { value: "batches:write", label: "Manage Batches" },
  { value: "attendance:read", label: "View Attendance" },
  { value: "attendance:write", label: "Mark & Edit Attendance" },
  { value: "fees:read", label: "View Fee Ledger" },
  { value: "fees:write", label: "Collect Student Fees" },
  { value: "exams:read", label: "View Exams & Marksheets" },
  { value: "exams:write", label: "Manage Exams & Marks" },
  { value: "certificates:read", label: "View Certificates" },
  { value: "certificates:issue", label: "Issue & Revoke Certificates" },
  { value: "wallet:read", label: "View Platform Wallet" },
  { value: "reports:read", label: "View Reports & Exports" },
  { value: "communication:send", label: "Send Notifications" },
];

export function StaffManagementClient({
  initialStaff,
  canCreate,
}: {
  initialStaff: UserProfileRecord[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [staffList, setStaffList] = React.useState(initialStaff);
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [permissions, setPermissions] = React.useState<StaffPermission[]>([
    "students:read",
    "attendance:read",
    "attendance:write",
  ]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = React.useState<string | null>(null);

  const togglePermission = (perm: StaffPermission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreatedPassword(null);
    try {
      const res = await fetch("/api/institute/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, permissions }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { staff: UserProfileRecord; temporaryPassword: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create staff member.");
        return;
      }
      setStaffList((prev) => [json.data!.staff, ...prev]);
      setCreatedPassword(json.data.temporaryPassword);
      setDisplayName("");
      setEmail("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (uid: string, nextDisabled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/institute/staff/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: nextDisabled }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { staff: UserProfileRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to update staff status.");
        return;
      }
      setStaffList((prev) => prev.map((m) => (m.uid === uid ? json.data!.staff : m)));
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle>Staff &amp; Teachers Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {staffList.length === 0 ? (
            <p className="text-muted text-sm">No staff accounts added yet.</p>
          ) : (
            <div className="space-y-3">
              {staffList.map((member) => (
                <div
                  key={member.uid}
                  className="border-border space-y-2.5 rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-foreground font-medium">{member.displayName}</p>
                      <p className="text-muted text-xs">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.disabled ? "danger" : "success"}>
                        {member.disabled ? "Suspended" : "Active"}
                      </Badge>
                      {canCreate && (
                        <Button
                          variant="outline"
                          size="sm"
                          loading={loading}
                          onClick={() => handleToggleStatus(member.uid, !member.disabled)}
                        >
                          {member.disabled ? "Activate" : "Suspend"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {member.permissions.map((perm) => (
                      <Badge key={perm} variant="outline">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canCreate && (
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Add Staff / Teacher</CardTitle>
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
            {createdPassword && (
              <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  Staff account created. Temporary password:{" "}
                  <span className="text-foreground font-mono font-bold">
                    {createdPassword}
                  </span>
                </div>
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Staff / Teacher Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="space-y-1.5">
                <p className="text-foreground text-sm font-medium">Module Permissions</p>
                <div className="border-border grid max-h-60 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border p-3">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <Checkbox
                      key={perm.value}
                      label={perm.label}
                      checked={permissions.includes(perm.value)}
                      onChange={() => togglePermission(perm.value)}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" fullWidth loading={loading}>
                Create Staff Account
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
