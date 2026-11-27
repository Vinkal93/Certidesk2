"use client";

import * as React from "react";
import { ShieldPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface SuperAdminAccountSummary {
  uid: string;
  email: string;
  displayName: string;
  disabled: boolean;
  createdAt: string;
}

export function CreateSuperAdminCard({
  initialAdmins,
}: {
  initialAdmins: SuperAdminAccountSummary[];
}) {
  const [admins, setAdmins] = React.useState<SuperAdminAccountSummary[]>(initialAdmins);
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/su/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { admin?: SuperAdminAccountSummary };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data?.admin) {
        setError(json.error?.message ?? "Failed to create Super Admin account.");
        return;
      }

      setAdmins((prev) => [json.data!.admin!, ...prev]);
      setNotice(
        `Super Admin account created for ${json.data.admin.email}. They can now sign in at /su/login using their email, password, and the Super Admin Secret Key.`
      );
      setDisplayName("");
      setEmail("");
      setPassword("");
    } catch {
      setError("Network error while creating Super Admin account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldPlus className="text-primary h-4 w-4" aria-hidden="true" />
          Super Admin Accounts &amp; Provisioning
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleCreate} className="space-y-3">
          <p className="text-muted text-xs">
            Create a new Super Admin ID &amp; password. All Super Admin logins still
            require the server-verified Super Admin Secret Key.
          </p>

          {error && (
            <div className="bg-danger-soft text-danger rounded-lg p-2.5 text-xs">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              {notice}
            </div>
          )}

          <Input
            label="Full Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Vinkal Admin"
            required
          />
          <Input
            label="Super Admin Email ID"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin2@certidesk.app"
            required
          />
          <Input
            label="Password (min 6 characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter strong password"
            minLength={6}
            required
          />
          <Button type="submit" loading={submitting}>
            Create Super Admin Account
          </Button>
        </form>

        <div className="space-y-2.5">
          <p className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
            <Users className="text-primary h-3.5 w-3.5" aria-hidden="true" />
            Active Super Admins ({admins.length})
          </p>
          <div className="sidebar-scroll max-h-64 space-y-2 overflow-y-auto pr-1">
            {admins.map((a) => (
              <div
                key={a.uid}
                className="border-border bg-surface flex items-center justify-between rounded-xl border px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="text-foreground truncate font-semibold">
                    {a.displayName}
                  </p>
                  <p className="text-muted truncate">{a.email}</p>
                </div>
                <Badge variant={a.disabled ? "danger" : "navy"}>
                  {a.disabled ? "Disabled" : "super_admin"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
