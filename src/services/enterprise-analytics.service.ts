import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  institutesCollection,
  paymentOrdersCollection,
  studentsCollection,
  usersCollection,
  walletTransactionsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import type { SessionUser } from "@/types/auth";

export interface MetricDefinition {
  key: string;
  label: string;
  value: string;
  definition: string;
  source: string;
  timeWindow: string;
}

export async function getEnterpriseAnalytics(
  actor: SessionUser,
  range: "7d" | "30d" | "90d" | "all" = "30d"
) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }

  const cutoff =
    range === "all"
      ? null
      : new Date(
          Date.now() -
            (range === "7d" ? 7 : range === "30d" ? 30 : 90) * 24 * 60 * 60 * 1000
        ).toISOString();

  const db = getAdminFirestore();
  const [
    instSnap,
    studentsSnap,
    staffSnap,
    paymentsSnap,
    walletTxSnap,
    certsSnap,
    marksheetsSnap,
    subsSnap,
  ] = await Promise.all([
    institutesCollection().get(),
    studentsCollection().get(),
    usersCollection().where("role", "==", "staff").get(),
    paymentOrdersCollection().get(),
    walletTransactionsCollection().get(),
    db.collection("certificates").get(),
    db.collection("marksheets").get(),
    db.collection("subscriptions").get(),
  ]);

  const institutes = instSnap.docs.map((d) => d.data());
  const students = studentsSnap.docs.map((d) => d.data());
  const payments = paymentsSnap.docs.map((d) => d.data());
  const walletTxs = walletTxSnap.docs.map((d) => d.data());

  const rangeInstitutes = cutoff
    ? institutes.filter((i) => i.createdAt >= cutoff)
    : institutes;
  const rangePayments = cutoff ? payments.filter((p) => p.createdAt >= cutoff) : payments;
  const rangeWalletTxs = cutoff
    ? walletTxs.filter((t) => t.createdAt >= cutoff)
    : walletTxs;

  const activeInstitutes = institutes.filter((i) => i.status === "active").length;
  const suspendedInstitutes = institutes.filter((i) => i.status === "suspended").length;
  const activationRate =
    institutes.length > 0
      ? Math.round((activeInstitutes / institutes.length) * 100)
      : null;

  const liveCaptured = rangePayments.filter(
    (p) => p.environment === "live" && p.status === "captured"
  );
  const liveFailed = rangePayments.filter(
    (p) => p.environment === "live" && p.status === "failed"
  );
  const liveRefunded = rangePayments.filter(
    (p) => p.environment === "live" && p.refundedAmountPaise > 0
  );

  // Strictly separate collections vs wallet liability vs recognized revenue
  const verifiedPaymentCollectionsPaise = liveCaptured.reduce(
    (sum, p) => sum + p.amountPaise,
    0
  );
  const walletLiabilityPaise = institutes.reduce(
    (sum, i) => sum + i.walletBalancePaise,
    0
  );
  const recognizedRevenuePaise = rangeWalletTxs
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amountPaise, 0);
  const totalRefundedPaise = liveRefunded.reduce(
    (sum, p) => sum + p.refundedAmountPaise,
    0
  );

  const liveAttempts = liveCaptured.length + liveFailed.length;
  const paymentSuccessRate =
    liveAttempts > 0 ? Math.round((liveCaptured.length / liveAttempts) * 100) : null;

  const definitions: MetricDefinition[] = [
    {
      key: "total_institutes",
      label: "Total Institutes",
      value: String(institutes.length),
      definition: "Count of all provisioned institute documents.",
      source: "institutes",
      timeWindow: "All time",
    },
    {
      key: "activation_rate",
      label: "Institute Activation Rate",
      value: activationRate !== null ? `${activationRate}%` : "Insufficient data",
      definition: "Active institutes divided by total institutes.",
      source: "institutes.status",
      timeWindow: "Current snapshot",
    },
    {
      key: "new_registrations",
      label: "New Institute Registrations",
      value: String(rangeInstitutes.length),
      definition: "Institutes created within the selected window.",
      source: "institutes.createdAt",
      timeWindow: range,
    },
    {
      key: "active_students",
      label: "Active Students / Total",
      value: `${students.filter((s) => s.status === "active").length} / ${students.length}`,
      definition: "Students with status='active' vs total students.",
      source: "students",
      timeWindow: "Current snapshot",
    },
    {
      key: "total_staff",
      label: "Total Staff",
      value: String(staffSnap.size),
      definition: "User profiles with role='staff'.",
      source: "users",
      timeWindow: "Current snapshot",
    },
    {
      key: "verified_collections",
      label: "Verified Live Collections",
      value: `₹${(verifiedPaymentCollectionsPaise / 100).toFixed(2)}`,
      definition: "Sum of captured LIVE Razorpay wallet recharge orders.",
      source: "payment_orders (environment='live', status='captured')",
      timeWindow: range,
    },
    {
      key: "wallet_liability",
      label: "Platform Wallet Liability",
      value: `₹${(walletLiabilityPaise / 100).toFixed(2)}`,
      definition: "Sum of unspent institute wallet balances.",
      source: "institutes.walletBalancePaise",
      timeWindow: "Current snapshot",
    },
    {
      key: "recognized_revenue",
      label: "Recognized Platform Revenue",
      value: `₹${(recognizedRevenuePaise / 100).toFixed(2)}`,
      definition: "Sum of consumed debit transactions (admissions, chargeable updates).",
      source: "wallet_transactions (type='debit')",
      timeWindow: range,
    },
    {
      key: "refund_totals",
      label: "Live Refund Totals",
      value: `₹${(totalRefundedPaise / 100).toFixed(2)}`,
      definition: "Sum of refundedAmountPaise across LIVE orders.",
      source: "payment_orders",
      timeWindow: range,
    },
    {
      key: "payment_success_rate",
      label: "Live Payment Success Rate",
      value: paymentSuccessRate !== null ? `${paymentSuccessRate}%` : "Insufficient data",
      definition: "Captured LIVE orders divided by (captured + failed) LIVE orders.",
      source: "payment_orders",
      timeWindow: range,
    },
    {
      key: "certificates_generated",
      label: "Certificates Generated",
      value: String(certsSnap.size),
      definition: "Total certificate documents issued across institutes.",
      source: "certificates",
      timeWindow: "All time",
    },
    {
      key: "marksheets_generated",
      label: "Marksheets Generated",
      value: String(marksheetsSnap.size),
      definition: "Total evaluated marksheet documents.",
      source: "marksheets",
      timeWindow: "All time",
    },
    {
      key: "subscriptions_count",
      label: "Active Subscriptions",
      value: String(subsSnap.docs.filter((d) => d.data().status === "active").length),
      definition: "Active institute plan subscriptions.",
      source: "subscriptions",
      timeWindow: "Current snapshot",
    },
  ];

  return {
    range,
    generatedAt: new Date().toISOString(),
    summary: {
      totalInstitutes: institutes.length,
      activeInstitutes,
      suspendedInstitutes,
      verifiedPaymentCollectionsPaise,
      walletLiabilityPaise,
      recognizedRevenuePaise,
      totalRefundedPaise,
      paymentSuccessRate,
    },
    definitions,
  };
}
