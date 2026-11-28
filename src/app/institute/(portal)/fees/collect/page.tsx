import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { studentsCollection } from "@/lib/firebase/firestore";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { FeeCollectClient } from "@/features/finance/components/fee-collect-client";
import type { CourseRecord } from "@/types/academic";

export default async function InstituteFeeCollectPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const [data, institute] = await Promise.all([
    getInstituteFinanceOverview(user, { range: "all" }),
    resolveAuthorizedInstitute(user),
  ]);

  const [studentsSnap, coursesSnap] = await Promise.all([
    studentsCollection().where("instituteId", "==", institute.id).get(),
    getAdminFirestore()
      .collection("courses")
      .where("instituteId", "==", institute.id)
      .get(),
  ]);

  const courseById = new Map<string, CourseRecord>();
  const courseByName = new Map<string, CourseRecord>();
  for (const doc of coursesSnap.docs) {
    const c = doc.data() as CourseRecord;
    if (c.status !== "deleted") {
      courseById.set(c.id, c);
      courseByName.set(c.name.trim().toLowerCase(), c);
    }
  }

  const students = studentsSnap.docs
    .map((d) => {
      const s = d.data();
      const matchedCourse =
        (s.courseId ? courseById.get(s.courseId) : undefined) ??
        courseByName.get((s.courseName ?? "").trim().toLowerCase());
      return {
        id: d.id,
        studentId: s.studentCode ?? d.id,
        fullName: s.fullName ?? "Student",
        courseName: s.courseName ?? "Course",
        status: s.status ?? "active",
        admissionDate: s.admissionDate || s.createdAt,
        courseFeePaise: matchedCourse?.feePaise,
        monthlyFeePaise: matchedCourse?.monthlyFeePaise,
        durationMonths: matchedCourse?.durationMonths,
        admissionFeePaise: matchedCourse?.admissionFeePaise,
      };
    })
    .filter((s) => s.status === "active")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <FeeCollectClient plans={data.plans} accounts={data.accounts} students={students} />
  );
}
