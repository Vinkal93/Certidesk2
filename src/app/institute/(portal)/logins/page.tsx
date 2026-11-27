import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { listInstituteLogins } from "@/services/institute-logins.service";
import { ManageLoginsClient } from "@/features/institutes/components/manage-logins-client";

export const metadata: Metadata = {
  title: "Manage Logins & Passwords",
  robots: { index: false, follow: false },
};

export default async function InstituteManageLoginsPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }
  if (user.role !== "institute_admin" && !hasStaffPermission(user, "students:write")) {
    redirect("/institute/dashboard");
  }

  const members = await listInstituteLogins(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Manage Student &amp; Staff Logins
        </h1>
        <p className="text-muted mt-1 text-sm">
          Update login email IDs, reset passwords, or enable/disable portal access.
          Changes take effect immediately for Student &amp; Staff logins.
        </p>
      </div>
      <ManageLoginsClient initialMembers={members} />
    </div>
  );
}
