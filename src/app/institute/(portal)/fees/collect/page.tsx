import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { studentsCollection } from "@/lib/firebase/firestore";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { getInstituteFinanceOverview } from "@/services/institute-finance.service";
import { FeeCollectClient } from "@/features/finance/components/fee-collect-client";

export default async function InstituteFeeCollectPage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const [data, institute] = await Promise.all([
    getInstituteFinanceOverview(user),
    resolveAuthorizedInstitute(user),
  ]);

  const studentsSnap = await studentsCollection()
    .where("instituteId", "==", institute.id)
    .get();

  const students = studentsSnap.docs
    .map((d) => {
      const s = d.data();
      return {
        id: d.id,
        studentId: s.studentCode ?? d.id,
        fullName: s.fullName ?? "Student",
        courseName: s.courseName ?? "Course",
        status: s.status ?? "active",
      };
    })
    .filter((s) => s.status === "active")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <FeeCollectClient plans={data.plans} accounts={data.accounts} students={students} />
  );
}
