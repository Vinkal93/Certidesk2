import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, Phone, MapPin } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { getStudentPortalContext } from "@/services/student-portal.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Institute Support",
  robots: { index: false, follow: false },
};

export default async function StudentSupportPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { institute } = await getStudentPortalContext(user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact {institute.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted">
          For batch transfers, profile updates, fee receipts, or certificate queries,
          contact your institute administration directly:
        </p>
        <div className="border-border bg-surface space-y-2.5 rounded-xl border p-4">
          <p className="flex items-center gap-2.5">
            <Mail className="text-primary h-4 w-4" aria-hidden="true" />
            <span>{institute.email}</span>
          </p>
          <p className="flex items-center gap-2.5">
            <Phone className="text-primary h-4 w-4" aria-hidden="true" />
            <span>{institute.phone}</span>
          </p>
          <p className="flex items-center gap-2.5">
            <MapPin className="text-primary h-4 w-4" aria-hidden="true" />
            <span>{institute.address}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
