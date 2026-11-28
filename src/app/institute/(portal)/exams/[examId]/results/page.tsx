import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthError, getInstitutePortalSessionUser } from "@/lib/security/session";
import { getOnlineExamDetails } from "@/services/online-exam.service";
import { ExamResultsClient } from "@/features/exams/components/exam-results-client";

export default async function OnlineExamResultsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const user = await getInstitutePortalSessionUser();
  if (!user) {
    redirect("/login/institute");
  }
  const { examId } = await params;

  let details;
  try {
    details = await getOnlineExamDetails(user, examId);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/institute/exams"
        className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium print:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Online Exams
      </Link>

      <ExamResultsClient
        exam={details.exam}
        attempts={details.attempts}
        results={details.results}
        analytics={details.analytics}
        batchNames={details.batchNames}
      />
    </div>
  );
}
