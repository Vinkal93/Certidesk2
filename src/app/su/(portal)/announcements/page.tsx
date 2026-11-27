import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { institutesCollection } from "@/lib/firebase/firestore";
import { listSentPopupMessages } from "@/services/popup-messages.service";
import { listPlatformAnnouncements } from "@/services/su-platform.service";
import { AnnouncementsClient } from "@/features/super-admin/components/announcements-client";
import { PopupMessageComposer } from "@/components/portal/popup-message-composer";

export const metadata: Metadata = {
  title: "Announcements & Popup Alerts",
  robots: { index: false, follow: false },
};

export default async function SuAnnouncementsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su/login");

  const [announcements, institutesSnap, sentPopups] = await Promise.all([
    listPlatformAnnouncements(user),
    institutesCollection().get(),
    listSentPopupMessages(user),
  ]);

  const instituteTargets = institutesSnap.docs
    .map((d) => ({
      id: d.id,
      label: `${d.data().name} (${d.data().code})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Popup Messages &amp; Platform Announcements
        </h2>
        <p className="text-muted text-sm">
          Send direct first-time popup alerts to any institute (or broadcast to all) and
          publish platform-wide announcements.
        </p>
      </div>
      <PopupMessageComposer
        mode="super_admin"
        targets={instituteTargets}
        initialSent={sentPopups}
      />
      <AnnouncementsClient initialAnnouncements={announcements} />
    </div>
  );
}
