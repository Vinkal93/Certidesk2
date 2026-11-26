import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentPortalContext } from "@/services/student-portal.service";
import { StudentPasswordForm } from "@/features/students/components/student-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};

export default async function StudentSettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { student, institute } = await getStudentPortalContext(user);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <StudentPasswordForm mustChangePassword={student.mustChangePassword} />
      </div>
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Account &amp; Session Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Student ID</span>
            <span className="font-mono font-semibold">{student.studentCode}</span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Institute</span>
            <span className="font-medium">{institute.name}</span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Account Status</span>
            <Badge variant="success">{student.status}</Badge>
          </div>
          <p className="text-muted pt-1 text-xs">
            Role, Student ID, and Institute assignment are managed by your institute
            administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
