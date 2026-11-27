import { redirect } from "next/navigation";
import { getInstitutePortalSessionUser } from "@/lib/security/session";
import { listBatches, listCourses } from "@/services/academic.service";
import { listOnlineExams, listQuestionBank } from "@/services/online-exam.service";
import { OnlineExamManagerClient } from "@/features/exams/components/online-exam-manager-client";

export default async function NewOnlineExamPage() {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/login/institute");
  }

  const [exams, courses, batches, questions] = await Promise.all([
    listOnlineExams(user),
    listCourses(user).catch(() => []),
    listBatches(user).catch(() => []),
    listQuestionBank(user).catch(() => []),
  ]);

  return (
    <OnlineExamManagerClient
      initialExams={exams}
      courses={courses}
      batches={batches}
      questions={questions}
    />
  );
}
