"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { useActionFeedback } from "@/components/ui/action-feedback-provider";
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
  const { confirm, runWithBanner } = useActionFeedback();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleRevoke(user: ManageableUser) {
    const resConfirm = await confirm({
      title: `Revoke active sessions for ${user.email}?`,
      description: `All Firebase refresh tokens for ${user.name} (${user.role}) will be invalidated immediately.`,
      confirmLabel: "Revoke Sessions",
      tone: "destructive",
      requireReason: true,
      reasonLabel: "Audit Reason",
      reasonPlaceholder: "Suspected compromise or role termination",
    });
    if (!resConfirm.confirmed) return;
    setError(null);
    setNotice(null);

    try {
      await runWithBanner({
        title: `Revoking sessions for ${user.email}`,
        successTitle: "Sessions revoked",
        successDescription: `All active sessions invalidated for ${user.email}.`,
        errorTitle: "Session revocation failed",
        tone: "warning",
        task: async () => {
          const res = await fetch("/api/su/security/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetUid: user.uid,
              reason: resConfirm.reason,
            }),
          });
          const json = (await res.json()) as { error?: { message?: string } };
          if (!res.ok) {
            throw new Error(json.error?.message ?? "Failed to revoke sessions.");
          }
        },
      });
      setNotice(`Revoked all active sessions for ${user.email}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke sessions.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Active Accounts & Session Revocation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-destructive text-sm">{error}</p>}
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
              <p className="text-muted-foreground text-xs">
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
