import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listBatches, listCourses } from "@/services/academic.service";
import { listInstituteStaff } from "@/services/staff.service";
import { BatchesClient } from "@/features/institutes/components/batches-client";

export const metadata: Metadata = {
  title: "New Batch",
  robots: { index: false, follow: false },
};

export default async function NewBatchPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/login/institute");
  }
  if (!hasStaffPermission(user, "batches:write")) {
    redirect("/institute/batches");
  }

  const [batches, courses, staffList] = await Promise.all([
    listBatches(user),
    listCourses(user).catch(() => []),
    listInstituteStaff(user).catch(() => []),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/institute/batches"
        className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Batches
      </Link>
      <BatchesClient
        initialBatches={batches}
        courses={courses}
        staffList={staffList}
        canWrite={true}
      />
    </div>
  );
}
