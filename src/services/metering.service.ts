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
