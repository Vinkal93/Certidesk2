import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  auditLogsCollection,
  feeReceiptsCollection,
  institutesCollection,
  studentsCollection,
  usersCollection,
  walletTransactionsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { resolveWalletBuckets } from "@/services/wallet.service";
import type { SessionUser } from "@/types/auth";
import type {
  AuditLogRecord,
  InstituteRecord,
  WalletTransactionRecord,
} from "@/types/domain";
import type { InstituteSubscriptionRecord } from "@/services/entitlement.service";

export interface InstituteLiveImpression {
  institute: InstituteRecord;
  subscription: InstituteSubscriptionRecord | null;
  kpis: {
    totalStudents: number;
    activeStudents: number;
    totalStaff: number;
    totalCourses: number;
    totalBatches: number;
    totalExams: number;
    totalCertificates: number;
    feeCollectedPaise: number;
    walletPaidPaise: number;
    walletBonusPaise: number;
    walletTotalPaise: number;
  };
  recentStudents: Array<{
    id: string;
    studentCode: string;
    fullName: string;
    email: string;
    status: string;
    createdAt: string;
  }>;
  recentCourses: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    feePaise: number;
  }>;
  recentExams: Array<{
    id: string;
    title: string;
    examDate: string;
    status: string;
  }>;
  recentCertificates: Array<{
    id: string;
    certificateNo: string;
    studentName: string;
    courseName: string;
    issuedAt: string;
  }>;
  recentTransactions: WalletTransactionRecord[];
  recentAuditLogs: AuditLogRecord[];
}

export async function getInstituteLiveImpression(
  actor: SessionUser,
  instituteId: string
): Promise<InstituteLiveImpression> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }

  const instDoc = await institutesCollection().doc(instituteId).get();
  if (!instDoc.exists) {
    throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
  }
  const institute = instDoc.data()!;
  const db = getAdminFirestore();

  const [
    studentsSnap,
    staffSnap,
    coursesSnap,
    batchesSnap,
    examsSnap,
    certsSnap,
    receiptsSnap,
    walletTxSnap,
    auditSnap,
    subsSnap,
  ] = await Promise.all([
    studentsCollection().where("instituteId", "==", instituteId).get(),
    usersCollection().where("instituteId", "==", instituteId).get(),
    db.collection("courses").where("instituteId", "==", instituteId).get(),
    db.collection("batches").where("instituteId", "==", instituteId).get(),
    db.collection("examinations").where("instituteId", "==", instituteId).get(),
    db.collection("certificates").where("instituteId", "==", instituteId).get(),
    feeReceiptsCollection().where("instituteId", "==", instituteId).get(),
    walletTransactionsCollection().where("instituteId", "==", instituteId).get(),
    auditLogsCollection().where("instituteId", "==", instituteId).get(),
    db.collection("subscriptions").where("instituteId", "==", instituteId).get(),
  ]);

  const students = studentsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  const staffCount = staffSnap.docs.filter((d) => d.data().role === "staff").length;

  const courses = coursesSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      name: String(data.name ?? data.title ?? "Course"),
      code: String(data.code ?? "—"),
      status: String(data.status ?? "active"),
      feePaise: Number(data.courseFeePaise ?? data.feePaise ?? 0),
    };
  });

  const exams = examsSnap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        title: String(data.title ?? "Examination"),
        examDate: String(data.examDate ?? data.createdAt ?? ""),
        status: String(data.status ?? "scheduled"),
      };
    })
    .sort((a, b) => b.examDate.localeCompare(a.examDate));

  const certificates = certsSnap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        certificateNo: String(data.certificateNo ?? d.id),
        studentName: String(data.studentName ?? "Student"),
        courseName: String(data.courseName ?? "Course"),
        issuedAt: String(data.issuedAt ?? data.createdAt ?? ""),
      };
    })
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  let feeCollectedPaise = 0;
  for (const doc of receiptsSnap.docs) {
    const r = doc.data();
    if (r.status !== "cancelled") {
      feeCollectedPaise += r.amountPaise ?? 0;
    }
  }

  const walletSummary = resolveWalletBuckets(institute);

  const recentTransactions = walletTxSnap.docs
    .map((d) => d.data())
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 10);

  const recentAuditLogs = auditSnap.docs
    .map((d) => d.data())
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 10);

  const subscriptions = subsSnap.docs
    .map((d) => d.data() as InstituteSubscriptionRecord)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  return {
    institute,
    subscription: subscriptions[0] ?? null,
    kpis: {
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === "active").length,
      totalStaff: staffCount,
      totalCourses: courses.length,
      totalBatches: batchesSnap.size,
      totalExams: exams.length,
      totalCertificates: certificates.length,
      feeCollectedPaise,
      walletPaidPaise: walletSummary.paidBalancePaise,
      walletBonusPaise: walletSummary.bonusBalancePaise,
      walletTotalPaise: walletSummary.totalSpendableBalancePaise,
    },
    recentStudents: students.slice(0, 8).map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      email: s.email,
      status: s.status,
      createdAt: s.createdAt,
    })),
    recentCourses: courses.slice(0, 8),
    recentExams: exams.slice(0, 8),
    recentCertificates: certificates.slice(0, 8),
    recentTransactions,
    recentAuditLogs,
  };
}
