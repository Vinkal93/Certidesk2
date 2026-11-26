import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Jobs & Queues",
  robots: { index: false, follow: false },
};

export default async function SuInfraJobsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Background Jobs & Queues</h1>
        <p className="text-muted-foreground text-sm">
          External worker queue telemetry status.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Cloud Tasks / Worker Queue</span>
            <Badge variant="outline">Not configured</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Not configured — no external background job queue is connected to this
          environment.
        </CardContent>
      </Card>
    </div>
  );
}
