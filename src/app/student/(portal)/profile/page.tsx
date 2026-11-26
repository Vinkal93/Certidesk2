import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { getStudentPortalContext } from "@/services/student-portal.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "My Profile",
  robots: { index: false, follow: false },
};

export default async function StudentProfilePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/student/login");

  const { student, institute } = await getStudentPortalContext(user);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Personal &amp; Guardian Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Full Name</span>
            <span className="font-medium">{student.fullName}</span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Student ID</span>
            <span className="font-mono font-semibold">{student.studentCode}</span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Email</span>
            <span className="font-medium">{student.email}</span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Phone</span>
            <span className="font-medium">{student.phone}</span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Guardian</span>
            <span className="font-medium">
              {student.guardianName || "—"}{" "}
              {student.guardianPhone ? `(${student.guardianPhone})` : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Address</span>
            <span className="font-medium">{student.address || "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic &amp; Institute Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Institute</span>
            <span className="font-medium">
              {institute.name} ({institute.code})
            </span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Course</span>
            <span className="font-medium">{student.courseName}</span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Batch</span>
            <span className="font-medium">{student.batchName}</span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span className="text-muted">Admission Date</span>
            <span className="font-mono text-xs">
              {student.admissionDate ?? student.createdAt.slice(0, 10)}
            </span>
          </div>
          <p className="text-muted pt-2 text-xs">
            To update chargeable profile fields, please submit a request to your institute
            administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
