"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ManageableUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  instituteId?: string;
  updatedAt: string;
}

export function SecuritySessionsClient({
  users,
  currentUid,
}: {
  users: ManageableUser[];
  currentUid: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleRevoke(user: ManageableUser) {
    const reason = window.prompt(
      `Revoke all active refresh tokens for ${user.email} (${user.role})? Enter audit reason:`
    );
    if (!reason?.trim()) return;
    setError(null);
    setNotice(null);

    const res = await fetch("/api/su/security/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUid: user.uid,
        reason: reason.trim(),
      }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      setError(json.error?.message ?? "Failed to revoke sessions.");
      return;
    }
    setNotice(`Revoked all active sessions for ${user.email}.`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Active Accounts & Session Revocation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-emerald-600">{notice}</p>}
        {users.map((u) => (
          <div
            key={u.uid}
            className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{u.name}</span>
                <Badge variant="outline">{u.role}</Badge>
                <Badge variant={u.status === "active" ? "success" : "danger"}>
                  {u.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {u.email} • UID: {u.uid}
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              disabled={u.uid === currentUid}
              onClick={() => handleRevoke(u)}
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Revoke Sessions
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
