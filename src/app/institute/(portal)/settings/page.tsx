import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { hasStaffPermission } from "@/lib/security/permissions";
import { getInstituteSettings } from "@/services/institute-ops.service";
import { SettingsClient } from "@/features/institutes/components/settings-client";

export const metadata: Metadata = {
  title: "Institute Settings",
  robots: { index: false, follow: false },
};

export default async function InstituteSettingsPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/institute/login");
  }
  if (!hasStaffPermission(user, "settings:write")) {
    redirect("/institute/dashboard");
  }

  const { institute, settings } = await getInstituteSettings(user);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Institute Settings
        </h2>
        <p className="text-muted text-sm">
          Manage your institute profile, academic year, certificate signatory, and
          notification preferences.
        </p>
      </div>
      <SettingsClient institute={institute} settings={settings} />
    </div>
  );
}
