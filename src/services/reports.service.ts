import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  auditLogsCollection,
  billingInvoicesCollection,
  creditNotesCollection,
  institutesCollection,
  paymentOrdersCollection,
  reportDefinitionsCollection,
  reportExportsCollection,
  reportSchedulesCollection,
  securityAlertsCollection,
  securityLoginEventsCollection,
  securitySessionsCollection,
  studentsCollection,
  usersCollection,
  walletTransactionsCollection,
  webhookEventsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog, redactSensitiveMetadata } from "./audit.service";
import { resolveWalletBuckets } from "./wallet.service";
import { getUsageOverview } from "./metering.service";
import type { SessionUser } from "@/types/auth";
import type {
  ApprovedReportDataset,
  ReportDefinitionRecord,
  ReportMetricDefinition,
  ReportRange,
  ReportScheduleRecord,
} from "@/types/reports";

function assertSuperAdmin(actor: SessionUser) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
}

export function getReportCutoffIso(range: ReportRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function sanitizeCsvCell(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

// ─── BUSINESS REPORT ─────────────────────────────────────────────────────────

export async function getBusinessReportData(
  actor: SessionUser,
  range: ReportRange = "30d"
) {
  assertSuperAdmin(actor);
  const cutoff = getReportCutoffIso(range);
  const db = getAdminFirestore();

  const [instSnap, studentsSnap, staffSnap, certsSnap, subsSnap, walletTxSnap] =
    await Promise.all([
      institutesCollection().get(),
      studentsCollection().get(),
      usersCollection().where("role", "==", "staff").get(),
      db.collection("certificates").get(),
      db.collection("subscriptions").get(),
      walletTransactionsCollection().get(),
    ]);

  const institutes = instSnap.docs.map((d) => d.data());
  const students = studentsSnap.docs.map((d) => d.data());
  const staff = staffSnap.docs.map((d) => d.data());
  const subs = subsSnap.docs.map(
    (d) => d.data() as { instituteId?: string; planName?: string; status?: string }
  );
  const walletTxs = walletTxSnap.docs.map((d) => d.data());

  const newInstitutes = cutoff
    ? institutes.filter((i) => i.createdAt >= cutoff)
    : institutes;
  const activeInstitutes = institutes.filter((i) => i.status === "active").length;
  const suspendedInstitutes = institutes.filter((i) => i.status === "suspended").length;

  const subByInstitute = new Map<string, { planName: string; status: string }>();
  for (const s of subs) {
    if (s.instituteId) {
      subByInstitute.set(s.instituteId, {
        planName: s.planName ?? "Unassigned",
        status: s.status ?? "unknown",
      });
    }
  }

  const planCounts = new Map<string, number>();
  for (const inst of institutes) {
    const plan = subByInstitute.get(inst.id)?.planName ?? "Prepaid Default";
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
  }

  // Monthly registration trend
  const monthMap = new Map<string, number>();
  for (const inst of institutes) {
    const month = inst.createdAt.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }
  const monthlyRegistrations = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // Onboarding funnel from real institute onboardingStatus
  const onboardingFunnel = {
    registered: institutes.length,
    verified: institutes.filter(
      (i) =>
        i.emailVerified ||
        i.onboardingStatus === "verified" ||
        i.onboardingStatus === "wallet_skipped" ||
        i.onboardingStatus === "completed"
    ).length,
    rechargedAtLeastOnce: institutes.filter((i) =>
      walletTxs.some((t) => t.instituteId === i.id && t.reason === "razorpay_recharge")
    ).length,
    admittedAtLeastOneStudent: institutes.filter((i) =>
      students.some((s) => s.instituteId === i.id)
    ).length,
  };

  const instituteDrilldown = institutes
    .map((inst) => {
      const instStudents = students.filter((s) => s.instituteId === inst.id);
      const instStaff = staff.filter((st) => st.instituteId === inst.id);
      const sub = subByInstitute.get(inst.id);
      const wallet = resolveWalletBuckets(inst);
      return {
        id: inst.id,
        code: inst.code,
        name: inst.name,
        status: inst.status,
        planName: sub?.planName ?? "Prepaid Default",
        studentCount: instStudents.length,
        staffCount: instStaff.length,
        walletBalancePaise: wallet.totalSpendableBalancePaise,
        createdAt: inst.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const definitions: ReportMetricDefinition[] = [
    {
      key: "total_institutes",
      label: "Total Institutes",
      value: String(institutes.length),
      definition: "Total registered institute documents.",
      source: "institutes",
      calculation: "COUNT(institutes)",
      timeWindow: "All time",
    },
    {
      key: "active_institutes",
      label: "Active Institutes",
      value: String(activeInstitutes),
      definition: "Institutes with status == 'active'.",
      source: "institutes",
      calculation: "COUNT(institutes WHERE status = 'active')",
      timeWindow: "Live",
    },
    {
      key: "new_registrations",
      label: "New Registrations",
      value: String(newInstitutes.length),
      definition: "Institutes created within the selected time window.",
      source: "institutes",
      calculation: "COUNT(institutes WHERE createdAt >= cutoff)",
      timeWindow: range,
    },
    {
      key: "total_students",
      label: "Total / Active Students",
      value: `${students.length} / ${students.filter((s) => s.status === "active").length}`,
      definition: "All student records across institutes vs active students.",
      source: "students",
      calculation: "COUNT(students)",
      timeWindow: "All time",
    },
  ];

  return {
    range,
    freshnessAt: new Date().toISOString(),
    summary: {
      totalInstitutes: institutes.length,
      activeInstitutes,
      suspendedInstitutes,
      newRegistrations: newInstitutes.length,
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.status === "active").length,
      totalStaff: staff.length,
      totalCertificates: certsSnap.size,
    },
    planDistribution: Array.from(planCounts.entries()).map(([plan, count]) => ({
      plan,
      count,
    })),
    monthlyRegistrations,
    onboardingFunnel,
    instituteDrilldown,
    definitions,
  };
}

// ─── FINANCIAL REPORT ────────────────────────────────────────────────────────

export async function getFinancialReportData(
  actor: SessionUser,
  range: ReportRange = "30d"
) {
  assertSuperAdmin(actor);
  const cutoff = getReportCutoffIso(range);

  const [
    instSnap,
    paymentsSnap,
    walletTxSnap,
    invoicesSnap,
    creditNotesSnap,
    webhooksSnap,
  ] = await Promise.all([
    institutesCollection().get(),
    paymentOrdersCollection().get(),
    walletTransactionsCollection().get(),
    billingInvoicesCollection().get(),
    creditNotesCollection().get(),
    webhookEventsCollection().get(),
  ]);

  const institutes = instSnap.docs.map((d) => d.data());
  const allPayments = paymentsSnap.docs.map((d) => d.data());
  const allWalletTxs = walletTxSnap.docs.map((d) => d.data());
  const allInvoices = invoicesSnap.docs.map((d) => d.data());
  const allCreditNotes = creditNotesSnap.docs.map((d) => d.data());
  const webhooks = webhooksSnap.docs.map((d) => d.data());

  const payments = cutoff
    ? allPayments.filter((p) => p.createdAt >= cutoff)
    : allPayments;
  const walletTxs = cutoff
    ? allWalletTxs.filter((t) => t.createdAt >= cutoff)
    : allWalletTxs;
  const invoices = cutoff
    ? allInvoices.filter((i) => i.createdAt >= cutoff)
    : allInvoices;

  const liveCaptured = payments.filter(
    (p) => p.environment === "live" && p.status === "captured"
  );
  const testCaptured = payments.filter(
    (p) => p.environment === "test" && p.status === "captured"
  );

  // Strict accounting separation:
  // 1. Verified Payment Collections (LIVE captured Razorpay)
  const verifiedLiveCollectionsPaise = liveCaptured.reduce(
    (s, p) => s + p.amountPaise,
    0
  );
  const testCollectionsPaise = testCaptured.reduce((s, p) => s + p.amountPaise, 0);

  // 2. Unspent Wallet Liability (Paid vs Promotional Bonus)
  let paidWalletLiabilityPaise = 0;
  let bonusWalletLiabilityPaise = 0;
  const lowBalanceInstitutes: Array<{
    id: string;
    name: string;
    code: string;
    balancePaise: number;
  }> = [];

  for (const inst of institutes) {
    const b = resolveWalletBuckets(inst);
    paidWalletLiabilityPaise += b.paidBalancePaise;
    bonusWalletLiabilityPaise += b.bonusBalancePaise;
    if (b.totalSpendableBalancePaise < inst.pricing.admissionFeePaise) {
      lowBalanceInstitutes.push({
        id: inst.id,
        name: inst.name,
        code: inst.code,
        balancePaise: b.totalSpendableBalancePaise,
      });
    }
  }

  // 3. Service Consumption Debits (recognized platform service usage)
  const admissionDebitsPaise = walletTxs
    .filter((t) => t.type === "debit" && t.reason === "student_admission")
    .reduce((s, t) => s + t.amountPaise, 0);
  const profileEditDebitsPaise = walletTxs
    .filter((t) => t.type === "debit" && t.reason === "student_profile_update")
    .reduce((s, t) => s + t.amountPaise, 0);
  const manualCreditsPaise = walletTxs
    .filter((t) => t.type === "credit" && t.reason === "manual_adjustment")
    .reduce((s, t) => s + t.amountPaise, 0);
  const promotionalCreditsGrantedPaise = walletTxs
    .filter((t) => t.type === "credit" && t.reason === "promotional_bonus")
    .reduce((s, t) => s + t.amountPaise, 0);
  const totalRefundedPaise = payments.reduce((s, p) => s + p.refundedAmountPaise, 0);

  const invoicedTotalPaise = invoices.reduce((s, i) => s + i.totalAmountPaise, 0);
  const outstandingInvoicesPaise = invoices
    .filter(
      (i) => i.status === "issued" || i.status === "pending" || i.status === "overdue"
    )
    .reduce((s, i) => s + i.totalAmountPaise, 0);

  const razorpayBreakdown = {
    created: payments.filter((p) => p.status === "created").length,
    authorized: payments.filter((p) => p.status === "authorized").length,
    captured: payments.filter((p) => p.status === "captured").length,
    failed: payments.filter((p) => p.status === "failed").length,
    refunded: payments.filter(
      (p) => p.status === "refunded" || p.status === "partially_refunded"
    ).length,
    webhookFailures: webhooks.filter(
      (w) => w.status === "rejected" || w.status === "failed"
    ).length,
    duplicateWebhooks: webhooks.filter((w) => w.status === "duplicate").length,
  };

  const definitions: ReportMetricDefinition[] = [
    {
      key: "verified_live_collections",
      label: "Verified LIVE Collections",
      value: `₹${(verifiedLiveCollectionsPaise / 100).toFixed(2)}`,
      definition:
        "Sum of LIVE captured Razorpay orders (not classified as revenue until consumed/invoiced).",
      source: "payment_orders",
      calculation: "SUM(amountPaise WHERE environment='live' AND status='captured')",
      timeWindow: range,
    },
    {
      key: "wallet_liability",
      label: "Total Wallet Liability (Paid + Bonus)",
      value: `₹${((paidWalletLiabilityPaise + bonusWalletLiabilityPaise) / 100).toFixed(2)}`,
      definition: "Unspent prepaid wallet credits held across all institutes.",
      source: "institutes",
      calculation: "SUM(paidBalancePaise + bonusBalancePaise)",
      timeWindow: "Live",
    },
    {
      key: "service_debits",
      label: "Recognized Service Debits",
      value: `₹${((admissionDebitsPaise + profileEditDebitsPaise) / 100).toFixed(2)}`,
      definition:
        "Consumed wallet debits for student admissions and chargeable profile edits.",
      source: "wallet_transactions",
      calculation:
        "SUM(amountPaise WHERE type='debit' AND reason IN ('student_admission','student_profile_update'))",
      timeWindow: range,
    },
  ];

  return {
    range,
    freshnessAt: new Date().toISOString(),
    summary: {
      verifiedLiveCollectionsPaise,
      testCollectionsPaise,
      paidWalletLiabilityPaise,
      bonusWalletLiabilityPaise,
      totalWalletLiabilityPaise: paidWalletLiabilityPaise + bonusWalletLiabilityPaise,
      admissionDebitsPaise,
      profileEditDebitsPaise,
      recognizedServiceRevenuePaise: admissionDebitsPaise + profileEditDebitsPaise,
      promotionalCreditsGrantedPaise,
      manualCreditsPaise,
      totalRefundedPaise,
      invoicedTotalPaise,
      outstandingInvoicesPaise,
      creditNotesCount: allCreditNotes.length,
    },
    razorpayBreakdown,
    lowBalanceInstitutes,
    recentTransactions: walletTxs
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50),
    definitions,
  };
}

// ─── USAGE REPORT ────────────────────────────────────────────────────────────

export async function getUsageReportData(actor: SessionUser) {
  assertSuperAdmin(actor);
  const db = getAdminFirestore();
  const [
    usage,
    instSnap,
    studentsSnap,
    staffSnap,
    certsSnap,
    marksheetsSnap,
    coursesSnap,
  ] = await Promise.all([
    getUsageOverview(actor),
    institutesCollection().get(),
    studentsCollection().get(),
    usersCollection().where("role", "==", "staff").get(),
    db.collection("certificates").get(),
    db.collection("marksheets").get(),
    db.collection("courses").get(),
  ]);

  const institutes = instSnap.docs.map((d) => d.data());
  const students = studentsSnap.docs.map((d) => d.data());
  const staff = staffSnap.docs.map((d) => d.data());

  const instituteUsageRows = institutes.map((inst) => {
    const sCount = students.filter((s) => s.instituteId === inst.id).length;
    const stCount = staff.filter((st) => st.instituteId === inst.id).length;
    return {
      instituteId: inst.id,
      instituteName: inst.name,
      code: inst.code,
      status: inst.status,
      studentsCount: sCount,
      staffCount: stCount,
    };
  });

  return {
    freshnessAt: new Date().toISOString(),
    billingPeriod: usage.billingPeriod,
    totals: {
      institutes: institutes.length,
      students: students.length,
      staff: staff.length,
      courses: coursesSnap.size,
      certificates: certsSnap.size,
      marksheets: marksheetsSnap.size,
    },
    externalTelemetryStatus: {
      firestoreBillingReadsWrites: "Not tracked (requires GCP Cloud Monitoring export)",
      apiLatencyMetrics: "Not tracked (requires APM instrumentation)",
    },
    aggregates: usage.aggregates,
    instituteUsageRows,
  };
}

// ─── SECURITY REPORT ─────────────────────────────────────────────────────────

export async function getSecurityReportData(
  actor: SessionUser,
  range: ReportRange = "30d"
) {
  assertSuperAdmin(actor);
  const cutoff = getReportCutoffIso(range);

  const [loginSnap, sessionsSnap, alertsSnap, auditsSnap, webhooksSnap] =
    await Promise.all([
      securityLoginEventsCollection().get(),
      securitySessionsCollection().get(),
      securityAlertsCollection().get(),
      auditLogsCollection().orderBy("createdAt", "desc").limit(250).get(),
      webhookEventsCollection().orderBy("receivedAt", "desc").limit(100).get(),
    ]);

  const logins = loginSnap.docs
    .map((d) => d.data())
    .filter((l) => !cutoff || l.timestamp >= cutoff);
  const sessions = sessionsSnap.docs.map((d) => d.data());
  const alerts = alertsSnap.docs.map((d) => d.data());
  const audits = auditsSnap.docs
    .map((d) => d.data())
    .filter((a) => !cutoff || a.createdAt >= cutoff);
  const webhooks = webhooksSnap.docs.map((d) => d.data());

  const resolvedAlerts = alerts.filter((a) => a.status === "resolved");
  let mttrMinutes: number | null = null;
  if (resolvedAlerts.length > 0) {
    const totalMs = resolvedAlerts.reduce(
      (s, a) => s + Math.max(0, Date.parse(a.updatedAt) - Date.parse(a.createdAt)),
      0
    );
    mttrMinutes = Math.round(totalMs / resolvedAlerts.length / 60000);
  }

  return {
    range,
    freshnessAt: new Date().toISOString(),
    authentication: {
      total: logins.length,
      success: logins.filter((l) => l.result === "success").length,
      failed: logins.filter((l) => l.result === "failed").length,
      blocked: logins.filter((l) => l.result === "blocked").length,
    },
    sessions: {
      total: sessions.length,
      active: sessions.filter((s) => s.status === "active").length,
      revoked: sessions.filter((s) => s.status === "revoked").length,
      expired: sessions.filter((s) => s.status === "expired").length,
    },
    governance: {
      permissionOverrides: audits.filter((a) => a.action === "ENTITLEMENT_OVERRIDE_SET")
        .length,
      sessionRevocations: audits.filter((a) => a.action === "SECURITY_SESSIONS_REVOKED")
        .length,
      deniedLogins: audits.filter((a) => a.action === "AUTH_LOGIN_REJECTED").length,
      rejectedWebhooks: webhooks.filter(
        (w) => w.status === "rejected" || w.status === "failed"
      ).length,
    },
    incidents: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      high: alerts.filter((a) => a.severity === "high").length,
      open: alerts.filter((a) => a.status !== "resolved" && a.status !== "false_positive")
        .length,
      resolved: resolvedAlerts.length,
      mttrMinutes,
    },
    redactedAudits: audits.slice(0, 50).map((a) => ({
      ...a,
      metadata: redactSensitiveMetadata(a.metadata),
    })),
  };
}

// ─── CUSTOM REPORT BUILDER & SCHEDULED REPORTS ───────────────────────────────

export async function runApprovedCustomReport(
  actor: SessionUser,
  input: {
    dataset: ApprovedReportDataset;
    range: ReportRange;
    limit?: number | undefined;
  }
): Promise<{ rows: Array<Record<string, unknown>>; total: number }> {
  assertSuperAdmin(actor);
  const cutoff = getReportCutoffIso(input.range);
  const maxRows = Math.min(Math.max(input.limit ?? 50, 1), 200);

  let rows: Array<Record<string, unknown>> = [];

  if (input.dataset === "institutes") {
    const snap = await institutesCollection().get();
    rows = snap.docs
      .map((d) => d.data())
      .filter((i) => !cutoff || i.createdAt >= cutoff)
      .map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        status: i.status,
        walletBalancePaise: i.walletBalancePaise,
        createdAt: i.createdAt,
      }));
  } else if (input.dataset === "wallet_transactions") {
    const snap = await walletTransactionsCollection().get();
    rows = snap.docs
      .map((d) => d.data())
      .filter((t) => !cutoff || t.createdAt >= cutoff)
      .map((t) => ({
        id: t.id,
        instituteId: t.instituteId,
        type: t.type,
        bucket: t.bucket ?? "paid",
        amountPaise: t.amountPaise,
        reason: t.reason,
        createdAt: t.createdAt,
      }));
  } else if (input.dataset === "payment_orders") {
    const snap = await paymentOrdersCollection().get();
    rows = snap.docs
      .map((d) => d.data())
      .filter((p) => !cutoff || p.createdAt >= cutoff)
      .map((p) => ({
        orderId: p.orderId,
        instituteId: p.instituteId,
        environment: p.environment,
        amountPaise: p.amountPaise,
        status: p.status,
        createdAt: p.createdAt,
      }));
  } else if (input.dataset === "billing_invoices") {
    const snap = await billingInvoicesCollection().get();
    rows = snap.docs
      .map((d) => d.data())
      .filter((i) => !cutoff || i.createdAt >= cutoff)
      .map((i) => ({
        invoiceNumber: i.invoiceNumber,
        instituteId: i.instituteId,
        totalAmountPaise: i.totalAmountPaise,
        status: i.status,
        issueDate: i.issueDate,
      }));
  } else if (input.dataset === "security_login_events") {
    const snap = await securityLoginEventsCollection().get();
    rows = snap.docs
      .map((d) => d.data())
      .filter((e) => !cutoff || e.timestamp >= cutoff)
      .map((e) => ({
        id: e.id,
        identifier: e.identifier,
        role: e.role,
        result: e.result,
        ipAddress: e.ipAddress,
        timestamp: e.timestamp,
      }));
  } else if (input.dataset === "audit_logs") {
    const snap = await auditLogsCollection()
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    rows = snap.docs
      .map((d) => d.data())
      .filter((a) => !cutoff || a.createdAt >= cutoff)
      .map((a) => ({
        id: a.id,
        action: a.action,
        actorUid: a.actorUid,
        actorRole: a.actorRole,
        instituteId: a.instituteId,
        createdAt: a.createdAt,
      }));
  }

  return { rows: rows.slice(0, maxRows), total: rows.length };
}

export async function listSavedDefinitionsAndSchedules(actor: SessionUser) {
  assertSuperAdmin(actor);
  const [defsSnap, schedSnap] = await Promise.all([
    reportDefinitionsCollection().get(),
    reportSchedulesCollection().get(),
  ]);
  return {
    definitions: defsSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    schedules: schedSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

export async function saveReportDefinition(
  actor: SessionUser,
  input: {
    name: string;
    category: ReportDefinitionRecord["category"];
    dataset: ApprovedReportDataset;
    range: ReportRange;
  }
): Promise<ReportDefinitionRecord> {
  assertSuperAdmin(actor);
  const id = generateId("RDEF");
  const now = new Date().toISOString();
  const record: ReportDefinitionRecord = {
    id,
    name: input.name.trim(),
    category: input.category,
    dataset: input.dataset,
    range: input.range,
    groupBy: null,
    filters: {},
    createdByUid: actor.uid,
    createdAt: now,
    updatedAt: now,
  };
  await reportDefinitionsCollection().doc(id).set(record);
  return record;
}

export async function saveReportSchedule(
  actor: SessionUser,
  input: {
    name: string;
    category: ReportScheduleRecord["category"];
    cadence: ReportScheduleRecord["cadence"];
    timezone: string;
    recipients: string[];
    enabled: boolean;
  }
): Promise<ReportScheduleRecord> {
  assertSuperAdmin(actor);
  const id = generateId("RSCH");
  const now = new Date().toISOString();
  const record: ReportScheduleRecord = {
    id,
    name: input.name.trim(),
    category: input.category,
    cadence: input.cadence,
    timezone: input.timezone,
    recipients: input.recipients,
    enabled: input.enabled,
    lastRunAt: null,
    lastDeliveryStatus: "never_run",
    lastError: null,
    createdByUid: actor.uid,
    createdAt: now,
    updatedAt: now,
  };
  await reportSchedulesCollection().doc(id).set(record);
  return record;
}

export async function recordReportExportAudit(
  actor: SessionUser,
  reportType: string,
  format: "csv" | "json",
  rowCount: number
): Promise<void> {
  assertSuperAdmin(actor);
  const id = generateId("REXP");
  const now = new Date().toISOString();
  await reportExportsCollection().doc(id).set({
    id,
    reportType,
    format,
    rowCount,
    actorUid: actor.uid,
    createdAt: now,
  });
  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    resourceType: "report_export",
    targetId: id,
    metadata: { reportType, format, rowCount },
  });
}
