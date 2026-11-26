import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
  institutesCollection,
  studentsCollection,
  usersCollection,
  walletTransactionsCollection,
  webhookEventsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import { getRazorpayGatewayConfig } from "./gateway.service";
import { computeWalletDebit } from "./wallet.service";
import type { SessionUser } from "@/types/auth";
import type { WalletTransactionRecord } from "@/types/domain";

export interface PlatformPricingConfig {
  id: "pricing";
  admissionFeePaise: number;
  profileUpdateFeePaise: number;
  certificateFeePaise: number;
  effectiveDate: string;
  updatedAt: string;
  updatedByUid: string;
}

export interface PricingHistoryRecord {
  id: string;
  admissionFeePaise: number;
  profileUpdateFeePaise: number;
  certificateFeePaise: number;
  effectiveDate: string;
  actorUid: string;
  createdAt: string;
}

export interface SubscriptionPlanRecord {
  id: string;
  name: string;
  description: string;
  monthlyDisplayRupees: number;
  yearlyDisplayRupees: number;
  maxStudents: number;
  maxStaff: number;
  storageLimitMb: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalCertificateTemplateRecord {
  id: string;
  name: string;
  layoutStyle: "classic" | "modern" | "merit";
  numberingPrefix: string;
  version: number;
  active: boolean;
  updatedAt: string;
}

export interface PlatformAnnouncementRecord {
  id: string;
  title: string;
  body: string;
  targetScope: "all" | "selected";
  targetInstituteIds: string[];
  status: "draft" | "published" | "scheduled";
  publishAt: string;
  expiresAt: string | null;
  createdByUid: string;
  createdAt: string;
}

function assertSuperAdmin(actor: SessionUser) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
}

export async function listInstituteOwners(actor: SessionUser, search?: string) {
  assertSuperAdmin(actor);
  const [ownersSnap, instSnap] = await Promise.all([
    usersCollection().where("role", "==", "institute_admin").get(),
    institutesCollection().get(),
  ]);
  const instMap = new Map(instSnap.docs.map((d) => [d.id, d.data()]));

  let items = ownersSnap.docs.map((d) => {
    const u = d.data();
    const inst = u.instituteId ? instMap.get(u.instituteId) : undefined;
    return {
      uid: u.uid,
      displayName: u.displayName,
      email: u.email,
      disabled: u.disabled,
      instituteId: u.instituteId,
      instituteName: inst?.name ?? "Unassigned",
      instituteCode: inst?.code ?? "—",
      instituteStatus: inst?.status ?? "unknown",
      createdAt: u.createdAt,
    };
  });

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (o) =>
        o.displayName.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.instituteName.toLowerCase().includes(q) ||
        o.instituteCode.toLowerCase().includes(q)
    );
  }
  return items;
}

export async function listGlobalStudents(
  actor: SessionUser,
  filter?: {
    search?: string | undefined;
    instituteId?: string | undefined;
    status?: string | undefined;
  }
) {
  assertSuperAdmin(actor);
  const [studentsSnap, instSnap] = await Promise.all([
    studentsCollection().orderBy("createdAt", "desc").limit(200).get(),
    institutesCollection().get(),
  ]);
  const instMap = new Map(instSnap.docs.map((d) => [d.id, d.data().name]));

  let items = studentsSnap.docs.map((d) => {
    const s = d.data();
    return {
      id: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      email: s.email,
      courseName: s.courseName,
      batchName: s.batchName,
      status: s.status,
      instituteId: s.instituteId,
      instituteName: instMap.get(s.instituteId) ?? s.instituteId,
      createdAt: s.createdAt,
    };
  });

  if (filter?.instituteId) {
    items = items.filter((s) => s.instituteId === filter.instituteId);
  }
  if (filter?.status && filter.status !== "all") {
    items = items.filter((s) => s.status === filter.status);
  }
  if (filter?.search?.trim()) {
    const q = filter.search.trim().toLowerCase();
    items = items.filter(
      (s) =>
        s.studentCode.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        s.courseName.toLowerCase().includes(q)
    );
  }
  return items;
}

export async function getCentralPricingConfig(actor: SessionUser) {
  assertSuperAdmin(actor);
  const db = getAdminFirestore();
  const [docSnap, histSnap] = await Promise.all([
    db.collection("platform_config").doc("pricing").get(),
    db.collection("pricing_history").orderBy("createdAt", "desc").limit(20).get(),
  ]);

  const current = (docSnap.data() as PlatformPricingConfig | undefined) ?? {
    id: "pricing" as const,
    admissionFeePaise: 15000,
    profileUpdateFeePaise: 10000,
    certificateFeePaise: 0,
    effectiveDate: new Date().toISOString().slice(0, 10),
    updatedAt: new Date(0).toISOString(),
    updatedByUid: "system",
  };

  return {
    current,
    history: histSnap.docs.map((d) => d.data() as PricingHistoryRecord),
  };
}

export async function updateCentralPricingConfig(
  actor: SessionUser,
  input: {
    admissionFeeRupees: number;
    profileUpdateFeeRupees: number;
    certificateFeeRupees: number;
    effectiveDate: string;
  }
): Promise<PlatformPricingConfig> {
  assertSuperAdmin(actor);
  const db = getAdminFirestore();
  const now = new Date().toISOString();

  const record: PlatformPricingConfig = {
    id: "pricing",
    admissionFeePaise: Math.round(input.admissionFeeRupees * 100),
    profileUpdateFeePaise: Math.round(input.profileUpdateFeeRupees * 100),
    certificateFeePaise: Math.round(input.certificateFeeRupees * 100),
    effectiveDate: input.effectiveDate,
    updatedAt: now,
    updatedByUid: actor.uid,
  };

  const histId = generateId("PRC");
  const batch = db.batch();
  batch.set(db.collection("platform_config").doc("pricing"), record);
  batch.set(db.collection("pricing_history").doc(histId), {
    id: histId,
    admissionFeePaise: record.admissionFeePaise,
    profileUpdateFeePaise: record.profileUpdateFeePaise,
    certificateFeePaise: record.certificateFeePaise,
    effectiveDate: record.effectiveDate,
    actorUid: actor.uid,
    createdAt: now,
  });
  await batch.commit();

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: "platform_pricing",
    metadata: {
      admissionFeePaise: record.admissionFeePaise,
      profileUpdateFeePaise: record.profileUpdateFeePaise,
      certificateFeePaise: record.certificateFeePaise,
    },
  });

  return record;
}

export async function listWalletsAndLedger(actor: SessionUser) {
  assertSuperAdmin(actor);
  const [instSnap, txSnap] = await Promise.all([
    institutesCollection().orderBy("createdAt", "desc").get(),
    walletTransactionsCollection().orderBy("createdAt", "desc").limit(100).get(),
  ]);

  return {
    institutes: instSnap.docs.map((d) => d.data()),
    transactions: txSnap.docs.map((d) => d.data()),
  };
}

export async function adjustInstituteWalletAtomic(
  actor: SessionUser,
  input: {
    instituteId: string;
    type: "credit" | "debit";
    amountRupees: number;
    reason: string;
    idempotencyKey: string;
  }
): Promise<{ alreadyProcessed: boolean; transaction: WalletTransactionRecord }> {
  assertSuperAdmin(actor);
  const amountPaise = Math.round(input.amountRupees * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AuthError(400, "INVALID_AMOUNT", "Adjustment amount must be positive.");
  }
  if (input.reason.trim().length < 5) {
    throw new AuthError(
      400,
      "REASON_REQUIRED",
      "A clear audit reason (min 5 chars) is required for manual wallet adjustments."
    );
  }

  const db = getAdminFirestore();
  const instRef = institutesCollection().doc(input.instituteId);
  const txDocId = `ADJ_${input.instituteId}_${input.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const txRef = walletTransactionsCollection().doc(txDocId);

  const result = await db.runTransaction(async (tx) => {
    const [instSnap, existingTxSnap] = await Promise.all([
      tx.get(instRef),
      tx.get(txRef),
    ]);
    const institute = instSnap.data();
    if (!instSnap.exists || !institute) {
      throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
    }

    if (existingTxSnap.exists && existingTxSnap.data()) {
      return {
        alreadyProcessed: true,
        transaction: existingTxSnap.data()!,
      };
    }

    const nextBalance =
      input.type === "credit"
        ? institute.walletBalancePaise + amountPaise
        : computeWalletDebit(institute.walletBalancePaise, amountPaise);

    const now = new Date().toISOString();
    const record: WalletTransactionRecord = {
      id: txDocId,
      instituteId: institute.id,
      type: input.type,
      amountPaise,
      balanceAfterPaise: nextBalance,
      reason: "manual_adjustment",
      referenceId: input.idempotencyKey,
      actorUid: actor.uid,
      note: input.reason.trim(),
      createdAt: now,
    };

    tx.update(instRef, { walletBalancePaise: nextBalance, updatedAt: now });
    tx.set(txRef, record);

    return { alreadyProcessed: false, transaction: record };
  });

  if (!result.alreadyProcessed) {
    await recordAuditLog({
      action: input.type === "credit" ? "WALLET_CREDITED" : "WALLET_DEBITED",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId: input.instituteId,
      targetId: txDocId,
      metadata: {
        amountPaise,
        balanceAfterPaise: result.transaction.balanceAfterPaise,
        reason: input.reason.trim(),
      },
    });
  }

  return result;
}

export async function listSubscriptionPlans(actor: SessionUser) {
  assertSuperAdmin(actor);
  const col = getAdminFirestore().collection(
    "subscription_plans"
  ) as CollectionReference<SubscriptionPlanRecord>;
  const snap = await col.orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => d.data());
}

export async function createSubscriptionPlan(
  actor: SessionUser,
  input: Omit<SubscriptionPlanRecord, "id" | "createdAt" | "updatedAt">
) {
  assertSuperAdmin(actor);
  const col = getAdminFirestore().collection(
    "subscription_plans"
  ) as CollectionReference<SubscriptionPlanRecord>;
  const id = generateId("PLN");
  const now = new Date().toISOString();
  const record: SubscriptionPlanRecord = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await col.doc(id).set(record);
  return record;
}

export async function listGlobalCertificateTemplates(actor: SessionUser) {
  assertSuperAdmin(actor);
  const col = getAdminFirestore().collection(
    "global_certificate_templates"
  ) as CollectionReference<GlobalCertificateTemplateRecord>;
  const snap = await col.orderBy("updatedAt", "desc").get();
  return snap.docs.map((d) => d.data());
}

export async function createGlobalCertificateTemplate(
  actor: SessionUser,
  input: Omit<GlobalCertificateTemplateRecord, "id" | "updatedAt">
) {
  assertSuperAdmin(actor);
  const col = getAdminFirestore().collection(
    "global_certificate_templates"
  ) as CollectionReference<GlobalCertificateTemplateRecord>;
  const id = generateId("TPL");
  const record: GlobalCertificateTemplateRecord = {
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  };
  await col.doc(id).set(record);
  return record;
}

export async function listPlatformAnnouncements(actor: SessionUser) {
  assertSuperAdmin(actor);
  const col = getAdminFirestore().collection(
    "platform_announcements"
  ) as CollectionReference<PlatformAnnouncementRecord>;
  const snap = await col.orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((d) => d.data());
}

export async function createPlatformAnnouncement(
  actor: SessionUser,
  input: {
    title: string;
    body: string;
    targetScope: "all" | "selected";
    targetInstituteIds: string[];
    status: "draft" | "published" | "scheduled";
    publishAt: string;
    expiresAt: string | null;
  }
) {
  assertSuperAdmin(actor);
  const col = getAdminFirestore().collection(
    "platform_announcements"
  ) as CollectionReference<PlatformAnnouncementRecord>;
  const id = generateId("ANN");
  const record: PlatformAnnouncementRecord = {
    ...input,
    id,
    createdByUid: actor.uid,
    createdAt: new Date().toISOString(),
  };
  await col.doc(id).set(record);
  return record;
}

export async function getSystemHealthReport(actor: SessionUser) {
  assertSuperAdmin(actor);

  const authStart = Date.now();
  let authHealthy = false;
  try {
    await getAdminAuth().listUsers(1);
    authHealthy = true;
  } catch {
    authHealthy = false;
  }
  const authLatencyMs = Date.now() - authStart;

  const fsStart = Date.now();
  let firestoreHealthy = false;
  try {
    await institutesCollection().limit(1).get();
    firestoreHealthy = true;
  } catch {
    firestoreHealthy = false;
  }
  const firestoreLatencyMs = Date.now() - fsStart;

  const [gatewayConfig, failedWebhooksSnap] = await Promise.all([
    getRazorpayGatewayConfig(),
    webhookEventsCollection().where("status", "==", "failed").get(),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    firebaseAuth: { healthy: authHealthy, latencyMs: authLatencyMs },
    firestore: { healthy: firestoreHealthy, latencyMs: firestoreLatencyMs },
    razorpay: {
      enabled: gatewayConfig.enabled,
      activeEnvironment: gatewayConfig.activeEnvironment,
      testStatus: gatewayConfig.testStatus,
      liveStatus: gatewayConfig.liveStatus,
      lastError: gatewayConfig.lastError,
    },
    failedWebhooks: failedWebhooksSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, 10),
  };
}
