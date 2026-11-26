import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentNotifications } from "@/services/student-portal.service";
import { StudentNotificationsClient } from "@/features/students/components/student-notifications-client";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function StudentNotificationsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const items = await getStudentNotifications(user);

  return <StudentNotificationsClient initialItems={items} />;
}
