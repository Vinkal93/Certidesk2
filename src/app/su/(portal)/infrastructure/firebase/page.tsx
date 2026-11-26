import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import {
  auditLogsCollection,
  institutesCollection,
  studentsCollection,
  usersCollection,
} from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Firebase & Database",
  robots: { index: false, follow: false },
};

async function measureFirestoreProbe() {
  const start = Date.now();
  const [instCount, userCount, studentCount, auditCount] = await Promise.all([
    institutesCollection().count().get(),
    usersCollection().count().get(),
    studentsCollection().count().get(),
    auditLogsCollection().count().get(),
  ]);
  return {
    probeMs: Date.now() - start,
    institutes: instCount.data().count,
    users: userCount.data().count,
    students: studentCount.data().count,
    audits: auditCount.data().count,
  };
}

export default async function SuInfraFirebasePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const stats = await measureFirestoreProbe();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Firebase & Firestore Diagnostics
          </h1>
          <p className="text-muted-foreground text-sm">
            Live Firestore Admin SDK connectivity and collection document counts.
          </p>
        </div>
        <Badge>Connected ({stats.probeMs}ms live probe)</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">institutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.institutes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">audit_logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.audits}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
