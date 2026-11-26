import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { usersCollection } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Institute Staff Directory",
  robots: { index: false, follow: false },
};

export default async function SuStaffPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const snap = await usersCollection().where("role", "==", "staff").limit(150).get();
  const staff = snap.docs.map((d) => d.data());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Institute Staff Directory</h1>
        <p className="text-sm text-muted-foreground">
          Cross-tenant view of provisioned institute staff accounts.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provisioned Staff ({staff.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No institute staff accounts found.</p>
          ) : (
            staff.map((s) => (
              <div key={s.uid} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{s.displayName}</span>{" "}
                  <span className="text-xs text-muted-foreground">({s.email})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{s.instituteId ?? "Unassigned"}</Badge>
                  <Badge variant={s.disabled ? "danger" : "success"}>
                    {s.disabled ? "disabled" : "active"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
