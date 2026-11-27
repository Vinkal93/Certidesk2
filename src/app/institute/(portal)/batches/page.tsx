import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listBatches, listCourses } from "@/services/academic.service";
import { listInstituteStaff } from "@/services/staff.service";
import { BatchesClient } from "@/features/institutes/components/batches-client";

export const metadata: Metadata = {
  title: "Batches",
  robots: { index: false, follow: false },
};

export default async function InstituteBatchesPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "batches:read")) {
    redirect("/institute/dashboard");
  }

  const [batches, courses, staffList] = await Promise.all([
    listBatches(user),
    hasStaffPermission(user, "courses:read") ? listCourses(user) : Promise.resolve([]),
    hasStaffPermission(user, "staff:read")
      ? listInstituteStaff(user)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Batches &amp; Faculty Allocation
        </h2>
        <p className="text-muted text-sm">
          Schedule batches, assign courses and teachers, and manage capacity.
        </p>
      </div>
      <BatchesClient
        initialBatches={batches}
        courses={courses}
        staffList={staffList}
        canWrite={hasStaffPermission(user, "batches:write")}
      />
    </div>
  );
}
