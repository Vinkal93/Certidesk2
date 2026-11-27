import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthError, getSessionUser } from "@/lib/security/session";
import { getBatchById } from "@/services/academic.service";
import { listInstituteStudents } from "@/services/student.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Batch Details",
  robots: { index: false, follow: false },
};

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/login/institute");
  }
  const { batchId } = await params;

  let batch;
  try {
    batch = await getBatchById(user, batchId);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    throw error;
  }

  const allStudents = await listInstituteStudents(user).catch(() => []);
  const enrolled = allStudents.filter(
    (s) => s.batchId === batch.id || s.batchName === batch.name
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/institute/batches"
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Batches
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-foreground text-2xl font-bold tracking-tight">
            {batch.name}
          </h2>
          <Badge variant={batch.status === "active" ? "success" : "outline"}>
            {batch.status}
          </Badge>
        </div>
        <p className="text-muted text-xs">
          Course: {batch.courseName} · Timing: {batch.timing} · Seats:{" "}
          {batch.enrolledCount}/{batch.capacity}
          {batch.teacherName ? ` · Teacher: ${batch.teacherName}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students ({enrolled.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-border divide-y text-xs">
            {enrolled.length === 0 ? (
              <p className="text-muted py-4">No students enrolled in this batch yet.</p>
            ) : (
              enrolled.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-foreground font-semibold">{s.fullName}</p>
                    <p className="text-muted font-mono">{s.studentCode}</p>
                  </div>
                  <Badge variant={s.status === "active" ? "success" : "outline"}>
                    {s.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
