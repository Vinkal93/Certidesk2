import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/security/session";
import { listGlobalQuestionBank } from "@/services/online-exam.service";
import { QuestionBankClient } from "@/features/exams/components/question-bank-client";

export default async function SuperAdminQuestionBankPage() {
  const user = await requireSessionUser("super_admin").catch(() => null);
  if (!user) redirect("/su/login");

  const questions = await listGlobalQuestionBank(user, true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-2xl font-bold tracking-tight">
          Global Question Bank
        </h2>
        <p className="text-muted text-sm">
          Upload and manage shared course question banks (CCC, ADCA, O Level, etc.). All
          active questions here are automatically available to every Institute Admin when
          creating Smart Online Exams.
        </p>
      </div>
      <QuestionBankClient
        initialQuestions={questions}
        apiBasePath="/api/su/question-bank"
      />
    </div>
  );
}
