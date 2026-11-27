import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { listQuestionBank } from "@/services/online-exam.service";
import { QuestionBankClient } from "@/features/exams/components/question-bank-client";

export default async function NewQuestionBankPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/login/institute");
  }
  const questions = await listQuestionBank(user);
  return <QuestionBankClient initialQuestions={questions} />;
}
