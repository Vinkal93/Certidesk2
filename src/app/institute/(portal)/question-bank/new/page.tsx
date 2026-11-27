import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listQuestionBank } from "@/services/online-exam.service";
import { QuestionBankClient } from "@/features/exams/components/question-bank-client";

export default async function NewQuestionBankPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/login/institute");
  }
  const questions = await listQuestionBank(user);
  return <QuestionBankClient initialQuestions={questions} />;
}
