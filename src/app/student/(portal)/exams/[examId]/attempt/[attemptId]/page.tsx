import { notFound, redirect } from "next/navigation";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/security/session";
import { StudentExamRunnerClient } from "@/features/exams/components/student-exam-runner-client";
import type { ExamAttemptRecord } from "@/types/online-exam";

export default async function StudentExamAttemptPage({
  params,
}: {
  params: Promise<{ examId: string; attemptId: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") redirect("/login/student");

  const { attemptId } = await params;
  const snap = await getAdminFirestore().collection("examAttempts").doc(attemptId).get();
  const attempt = snap.data() as ExamAttemptRecord | undefined;

  if (
    !snap.exists ||
    !attempt ||
    attempt.studentId !== user.studentId ||
    attempt.instituteId !== user.instituteId
  ) {
    notFound();
  }

  return <StudentExamRunnerClient attempt={attempt} />;
}
