import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection } from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import type { SessionUser } from "@/types/auth";

export type UsageMetricKey =
  | "students"
  | "staff"
  | "storage_bytes"
  | "certificates"
  | "marksheets"
  | "api_requests"
  | "file_uploads"
  | "messaging"
  | "background_jobs";

export interface UsageEventRecord {
  id: string;
  instituteId: string;
  metricKey: UsageMetricKey;
  quantity: number;
  unit: string;
  timestamp: string;
  billingPeriod: string; // YYYY-MM
  sourceOperation: string;
  idempotencyKey: string;
}

export interface UsageAggregateRecord {
  id: string; // {instituteId}_{YYYY-MM}
  instituteId: string;
  billingPeriod: string;
  counters: Partial<Record<UsageMetricKey, number>>;
  updatedAt: string;
}

export interface QuotaThresholdConfig {
  warningThresholds: number[]; // e.g. [70, 85, 95, 100]
  defaultLimits: Record<UsageMetricKey, number>;
}

function usageEventsCol() {
  return getAdminFirestore().collection(
    "usageEvents"
  ) as CollectionReference<UsageEventRecord>;
}

function usageAggregatesCol() {
  return getAdminFirestore().collection(
    "usageAggregates"
  ) as CollectionReference<UsageAggregateRecord>;
}

export function getCurrentBillingPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

/**
 * Idempotent central metering service.
 * Writes immutable usageEvents and atomically updates monthly usageAggregates
 * without ever erasing historical billing periods.
 */
export async function recordUsageEvent(input: {
  instituteId: string;
  metricKey: UsageMetricKey;
  quantity: number;
  unit: string;
  sourceOperation: string;
  idempotencyKey: string;
  billingPeriod?: string;
}): Promise<{ alreadyRecorded: boolean; aggregateTotal: number }> {
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    throw new AuthError(400, "INVALID_USAGE_QUANTITY", "Quantity must be non-negative.");
  }

  const period = input.billingPeriod ?? getCurrentBillingPeriod();
  const safeKey = input.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "");
  const eventId = `${input.instituteId}_${input.metricKey}_${safeKey}`;
  const aggId = `${input.instituteId}_${period}`;

  const db = getAdminFirestore();
  const eventRef = usageEventsCol().doc(eventId);
  const aggRef = usageAggregatesCol().doc(aggId);

  return db.runTransaction(async (tx) => {
    const [eventSnap, aggSnap] = await Promise.all([tx.get(eventRef), tx.get(aggRef)]);

    const existingAgg = aggSnap.data();
    const currentVal = existingAgg?.counters?.[input.metricKey] ?? 0;

    if (eventSnap.exists) {
      return { alreadyRecorded: true, aggregateTotal: currentVal };
    }

    const now = new Date().toISOString();
    const nextVal = currentVal + input.quantity;

    tx.set(eventRef, {
      id: eventId,
      instituteId: input.instituteId,
      metricKey: input.metricKey,
      quantity: input.quantity,
      unit: input.unit,
      timestamp: now,
      billingPeriod: period,
      sourceOperation: input.sourceOperation,
      idempotencyKey: input.idempotencyKey,
    });

    tx.set(aggRef, {
      id: aggId,
      instituteId: input.instituteId,
      billingPeriod: period,
      counters: {
        ...(existingAgg?.counters ?? {}),
        [input.metricKey]: nextVal,
      },
      updatedAt: now,
    });

    return { alreadyRecorded: false, aggregateTotal: nextVal };
  });
}

export async function getUsageOverview(
  actor: SessionUser,
  billingPeriod = getCurrentBillingPeriod()
) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }

  const [aggSnap, instSnap, eventsSnap] = await Promise.all([
    usageAggregatesCol().where("billingPeriod", "==", billingPeriod).get(),
    institutesCollection().get(),
    usageEventsCol().orderBy("timestamp", "desc").limit(50).get(),
  ]);

  const instMap = new Map(instSnap.docs.map((d) => [d.id, d.data().name]));
  const aggregates = aggSnap.docs.map((d) => ({
    ...d.data(),
    instituteName: instMap.get(d.data().instituteId) ?? d.data().instituteId,
  }));

  return {
    billingPeriod,
    aggregates,
    recentEvents: eventsSnap.docs.map((d) => d.data()),
    thresholds: [70, 85, 95, 100],
  };
}

export interface InstituteUsageBreakdown {
  instituteId: string;
  instituteName: string;
  instituteCode: string;
  status: string;
  students: number;
  staff: number;
  courses: number;
  batches: number;
  exams: number;
  certificates: number;
  feeReceipts: number;
  walletTransactions: number;
  totalUnits: number;
}

export interface DailyActivityPoint {
  date: string;
  label: string;
  admissions: number;
  transactions: number;
  receipts: number;
  total: number;
}

export async function getAdvancedUsageOverview(
  actor: SessionUser,
  billingPeriod = getCurrentBillingPeriod()
) {
  const base = await getUsageOverview(actor, billingPeriod);
  const db = getAdminFirestore();

  const [
    instSnap,
    studentsSnap,
    usersSnap,
    coursesSnap,
    batchesSnap,
    examsSnap,
    certsSnap,
    receiptsSnap,
    walletTxSnap,
  ] = await Promise.all([
    institutesCollection().get(),
    db.collection("students").get(),
    db.collection("users").get(),
    db.collection("courses").get(),
    db.collection("batches").get(),
    db.collection("examinations").get(),
    db.collection("certificates").get(),
    db.collection("feeReceipts").get(),
    db.collection("wallet_transactions").get(),
  ]);

  const breakdownMap = new Map<string, InstituteUsageBreakdown>();
  for (const doc of instSnap.docs) {
    const inst = doc.data();
    breakdownMap.set(inst.id, {
      instituteId: inst.id,
      instituteName: inst.name,
      instituteCode: inst.code,
      status: inst.status,
      students: 0,
      staff: 0,
      courses: 0,
      batches: 0,
      exams: 0,
      certificates: 0,
      feeReceipts: 0,
      walletTransactions: 0,
      totalUnits: 0,
    });
  }

  const bump = (
    instId: unknown,
    field: keyof Omit<
      InstituteUsageBreakdown,
      "instituteId" | "instituteName" | "instituteCode" | "status" | "totalUnits"
    >
  ) => {
    if (typeof instId !== "string") return;
    const entry = breakdownMap.get(instId);
    if (!entry) return;
    entry[field] += 1;
    entry.totalUnits += 1;
  };

  for (const d of studentsSnap.docs) bump(d.data().instituteId, "students");
  for (const d of usersSnap.docs) {
    if (d.data().role === "staff") bump(d.data().instituteId, "staff");
  }
  for (const d of coursesSnap.docs) bump(d.data().instituteId, "courses");
  for (const d of batchesSnap.docs) bump(d.data().instituteId, "batches");
  for (const d of examsSnap.docs) bump(d.data().instituteId, "exams");
  for (const d of certsSnap.docs) bump(d.data().instituteId, "certificates");
  for (const d of receiptsSnap.docs) bump(d.data().instituteId, "feeReceipts");
  for (const d of walletTxSnap.docs) bump(d.data().instituteId, "walletTransactions");

  const instituteBreakdown = Array.from(breakdownMap.values()).sort(
    (a, b) => b.totalUnits - a.totalUnits
  );

  // Build 14-day real activity series
  const today = new Date();
  const dailyMap = new Map<string, DailyActivityPoint>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    dailyMap.set(iso, {
      date: iso,
      label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      admissions: 0,
      transactions: 0,
      receipts: 0,
      total: 0,
    });
  }

  const bumpDay = (
    createdAt: unknown,
    field: "admissions" | "transactions" | "receipts"
  ) => {
    if (typeof createdAt !== "string") return;
    const day = createdAt.slice(0, 10);
    const point = dailyMap.get(day);
    if (!point) return;
    point[field] += 1;
    point.total += 1;
  };

  for (const d of studentsSnap.docs) bumpDay(d.data().createdAt, "admissions");
  for (const d of walletTxSnap.docs) bumpDay(d.data().createdAt, "transactions");
  for (const d of receiptsSnap.docs) bumpDay(d.data().createdAt, "receipts");

  return {
    ...base,
    summary: {
      totalInstitutes: instSnap.size,
      activeInstitutes: instSnap.docs.filter((d) => d.data().status === "active").length,
      totalStudents: studentsSnap.size,
      totalStaff: usersSnap.docs.filter((d) => d.data().role === "staff").length,
      totalCourses: coursesSnap.size,
      totalExams: examsSnap.size,
      totalCertificates: certsSnap.size,
      totalReceipts: receiptsSnap.size,
      totalWalletTx: walletTxSnap.size,
    },
    instituteBreakdown,
    dailySeries: Array.from(dailyMap.values()),
  };
}
