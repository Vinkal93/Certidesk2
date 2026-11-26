import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listPlatformAnnouncements } from "@/services/su-platform.service";
import { AnnouncementsClient } from "@/features/super-admin/components/announcements-client";

export const metadata: Metadata = {
  title: "Announcements",
  robots: { index: false, follow: false },
};

export default async function SuAnnouncementsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const announcements = await listPlatformAnnouncements(user);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Platform Announcements
        </h2>
        <p className="text-muted text-sm">
          Draft, schedule, and publish announcements across registered institutes.
        </p>
      </div>
      <AnnouncementsClient initialAnnouncements={announcements} />
    </div>
  );
}
