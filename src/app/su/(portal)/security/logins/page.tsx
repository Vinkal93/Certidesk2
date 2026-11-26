import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getSecurityCenterOverview } from "@/services/security-center.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Login Activity",
  robots: { index: false, follow: false },
};

export default async function SuSecurityLoginsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getSecurityCenterOverview(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Authentication & Login Activity
        </h1>
        <p className="text-muted-foreground text-sm">
          Recent authentication and session events from immutable audit_logs.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Auth Audit Stream ({data.loginAudits.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.loginAudits.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No authentication events recorded.
            </p>
          ) : (
            data.loginAudits.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs"
              >
                <div>
                  <Badge variant="outline">{a.action}</Badge>{" "}
                  <span className="ml-2 font-mono">{a.actorUid}</span> ({a.actorRole})
                </div>
                <span className="text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
