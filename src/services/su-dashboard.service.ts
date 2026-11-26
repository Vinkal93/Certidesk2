import "server-only";
import {
  auditLogsCollection,
  institutesCollection,
  paymentOrdersCollection,
  studentsCollection,
  usersCollection,
  walletTransactionsCollection,
  webhookEventsCollection,
} from "@/lib/firebase/firestore";
import { getRazorpayGatewayConfig } from "./gateway.service";

export type SuDashboardRange = "7d" | "30d" | "90d" | "all";

function getCutoffIso(range: SuDashboardRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getSuperAdminDashboardData(range: SuDashboardRange = "30d") {
  const cutoff = getCutoffIso(range);

  const [
    institutesSnap,
    studentsSnap,
    staffSnap,
    paymentsSnap,
    walletTxSnap,
    auditSnap,
    webhooksSnap,
    gatewayConfig,
  ] = await Promise.all([
    institutesCollection().orderBy("createdAt", "desc").get(),
    studentsCollection().get(),
    usersCollection().where("role", "==", "staff").get(),
    paymentOrdersCollection().orderBy("createdAt", "desc").limit(200).get(),
    walletTransactionsCollection().orderBy("createdAt", "desc").limit(100).get(),
    auditLogsCollection().orderBy("createdAt", "desc").limit(15).get(),
    webhookEventsCollection().orderBy("receivedAt", "desc").limit(15).get(),
    getRazorpayGatewayConfig(),
  ]);

  const institutes = institutesSnap.docs.map((d) => d.data());
  const payments = paymentsSnap.docs.map((d) => d.data());
  const walletTxs = walletTxSnap.docs.map((d) => d.data());

  const rangeInstitutes = cutoff
    ? institutes.filter((i) => i.createdAt >= cutoff)
    : institutes;
  const rangePayments = cutoff ? payments.filter((p) => p.createdAt >= cutoff) : payments;

  const liveCaptured = rangePayments.filter(
    (p) => p.environment === "live" && p.status === "captured"
  );
  const testCaptured = rangePayments.filter(
    (p) => p.environment === "test" && p.status === "captured"
  );
  const pendingPayments = rangePayments.filter(
    (p) => p.status === "created" || p.status === "authorized"
  );
  const failedPayments = rangePayments.filter((p) => p.status === "failed");

  const walletLiabilityPaise = institutes.reduce(
    (sum, i) => sum + i.walletBalancePaise,
    0
  );

  const liveRevenuePaise = liveCaptured.reduce((sum, p) => sum + p.amountPaise, 0);
  const testRevenuePaise = testCaptured.reduce((sum, p) => sum + p.amountPaise, 0);

  return {
    metrics: {
      totalInstitutes: institutes.length,
      activeInstitutes: institutes.filter((i) => i.status === "active").length,
      suspendedInstitutes: institutes.filter((i) => i.status === "suspended").length,
      newInstitutesInRange: rangeInstitutes.length,
      totalStudents: studentsSnap.size,
      totalStaff: staffSnap.size,
      totalPayments: rangePayments.length,
      liveRevenuePaise,
      testRevenuePaise,
      walletLiabilityPaise,
      pendingPaymentsCount: pendingPayments.length,
      failedPaymentsCount: failedPayments.length,
    },
    recentInstitutes: institutes.slice(0, 5),
    recentTransactions: payments.slice(0, 5),
    recentWalletRecharges: walletTxs.filter((t) => t.type === "credit").slice(0, 5),
    recentAudits: auditSnap.docs.map((d) => d.data()),
    recentWebhooks: webhooksSnap.docs.map((d) => d.data()),
    gatewayConfig,
  };
}
