import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { listBatches, listCourses } from "@/services/academic.service";
import { listFeeReminderRulesAndDashboard } from "@/services/fee-reminder.service";
import { listFeeStructures } from "@/services/institute-finance.service";
import { FeeStructureClient } from "@/features/finance/components/fee-structure-client";

export default async function InstituteFeeStructurePage() {
  const user = await requireSessionUser().catch(() => null);
  if (!user) redirect("/login/institute");

  const [structures, courses, batches, reminderData] = await Promise.all([
    listFeeStructures(user),
    listCourses(user),
    listBatches(user),
    listFeeReminderRulesAndDashboard(user),
  ]);

  return (
    <FeeStructureClient
      structures={structures}
      courses={courses}
      batches={batches}
      reminderRules={reminderData.rules}
      reminderDashboard={reminderData.dashboard}
    />
  );
}
