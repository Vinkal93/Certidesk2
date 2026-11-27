import "server-only";
import {
  paymentOrdersCollection,
  rechargePlansCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";
import type { RechargePlanRecord } from "@/types/domain";

const DEFAULT_RECHARGE_PLANS: Array<
  Omit<RechargePlanRecord, "createdAt" | "updatedAt" | "updatedByUid">
> = [
  {
    id: "plan_500",
    title: "Starter Recharge",
    description: "Standard prepaid credits for institute admissions and profile updates.",
    amountPaise: 50000,
    bonusPaise: 0,
    currency: "INR",
    enabled: true,
    displayOrder: 1,
    promoEligible: false,
    promoLabel: null,
    startsAt: null,
    endsAt: null,
    bonusExpiryDays: null,
    maxUsesPerInstitute: null,
  },
  {
    id: "plan_1000",
    title: "Growth Recharge",
    description: "Prepaid credits for regular batch admissions and operations.",
    amountPaise: 100000,
    bonusPaise: 0,
    currency: "INR",
    enabled: true,
    displayOrder: 2,
    promoEligible: false,
    promoLabel: null,
    startsAt: null,
    endsAt: null,
    bonusExpiryDays: null,
    maxUsesPerInstitute: null,
  },
  {
    id: "plan_2000",
    title: "Pro Promotional Pack",
    description:
      "Pay ₹2,000 and receive ₹2,200 total spendable credits (includes ₹200 promotional bonus).",
    amountPaise: 200000,
    bonusPaise: 20000,
    currency: "INR",
    enabled: true,
    displayOrder: 3,
    promoEligible: true,
    promoLabel: "+₹200 Promotional Bonus",
    startsAt: null,
    endsAt: null,
    bonusExpiryDays: 180,
    maxUsesPerInstitute: null,
  },
];

/**
 * Pure helper to evaluate whether a recharge plan is currently active and eligible.
 * Exported for unit testing.
 */
export function evaluatePlanEligibility(
  plan: RechargePlanRecord,
  options: { nowIso?: string; instituteUses?: number } = {}
): { eligible: boolean; reason?: string; effectiveBonusPaise: number } {
  if (!plan.enabled) {
    return {
      eligible: false,
      reason: "This recharge plan is currently disabled.",
      effectiveBonusPaise: 0,
    };
  }
  const nowMs = options.nowIso ? Date.parse(options.nowIso) : Date.now();
  if (plan.startsAt && nowMs < Date.parse(plan.startsAt)) {
    return {
      eligible: false,
      reason: "This recharge plan is not active yet.",
      effectiveBonusPaise: 0,
    };
  }
  if (plan.endsAt && nowMs > Date.parse(plan.endsAt)) {
    return {
      eligible: false,
      reason: "This recharge plan has expired.",
      effectiveBonusPaise: 0,
    };
  }
  if (
    plan.maxUsesPerInstitute !== null &&
    plan.maxUsesPerInstitute > 0 &&
    (options.instituteUses ?? 0) >= plan.maxUsesPerInstitute
  ) {
    return {
      eligible: false,
      reason: `Per-institute usage limit (${plan.maxUsesPerInstitute}) reached for this plan.`,
      effectiveBonusPaise: 0,
    };
  }

  return {
    eligible: true,
    effectiveBonusPaise: plan.promoEligible ? Math.max(0, plan.bonusPaise) : 0,
  };
}

export async function ensureDefaultRechargePlansSeeded(): Promise<void> {
  const snap = await rechargePlansCollection().get();
  if (!snap.empty) {
    return;
  }
  const now = new Date().toISOString();
  await Promise.all(
    DEFAULT_RECHARGE_PLANS.map((plan) =>
      rechargePlansCollection()
        .doc(plan.id)
        .set({
          ...plan,
          createdAt: now,
          updatedAt: now,
          updatedByUid: "system_seed",
        })
    )
  );
}

export async function listRechargePlans(
  includeDisabled = false
): Promise<RechargePlanRecord[]> {
  await ensureDefaultRechargePlansSeeded();
  const snap = await rechargePlansCollection().get();
  const all = snap.docs
    .map((d) => d.data())
    .sort((a, b) => a.displayOrder - b.displayOrder);
  if (includeDisabled) {
    return all;
  }
  return all.filter((plan) => evaluatePlanEligibility(plan).eligible);
}

export async function resolveEligibleRechargePlan(
  planId: string,
  instituteId: string
): Promise<{ plan: RechargePlanRecord; effectiveBonusPaise: number }> {
  await ensureDefaultRechargePlansSeeded();
  const snap = await rechargePlansCollection().doc(planId).get();
  const plan = snap.data();

  if (!snap.exists || !plan) {
    throw new AuthError(404, "RECHARGE_PLAN_NOT_FOUND", "Recharge plan not found.");
  }

  let instituteUses = 0;
  if (plan.maxUsesPerInstitute !== null && plan.maxUsesPerInstitute > 0) {
    const ordersSnap = await paymentOrdersCollection()
      .where("instituteId", "==", instituteId)
      .get();
    instituteUses = ordersSnap.docs
      .map((d) => d.data())
      .filter((o) => o.planId === plan.id && o.status === "captured").length;
  }

  const evaluation = evaluatePlanEligibility(plan, { instituteUses });
  if (!evaluation.eligible) {
    throw new AuthError(
      400,
      "RECHARGE_PLAN_UNAVAILABLE",
      evaluation.reason ?? "Recharge plan is unavailable."
    );
  }

  return {
    plan,
    effectiveBonusPaise: evaluation.effectiveBonusPaise,
  };
}

export async function upsertRechargePlan(
  actor: SessionUser,
  input: {
    id: string;
    title: string;
    description: string;
    amountPaise: number;
    bonusPaise: number;
    enabled: boolean;
    displayOrder: number;
    promoEligible: boolean;
    promoLabel: string | null;
    startsAt: string | null;
    endsAt: string | null;
    bonusExpiryDays: number | null;
    maxUsesPerInstitute: number | null;
  }
): Promise<RechargePlanRecord> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin required.");
  }
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 10000) {
    throw new AuthError(
      400,
      "INVALID_PLAN_AMOUNT",
      "Plan amount must be an integer in paise (>= ₹100)."
    );
  }
  if (!Number.isInteger(input.bonusPaise) || input.bonusPaise < 0) {
    throw new AuthError(
      400,
      "INVALID_BONUS_AMOUNT",
      "Bonus amount must be non-negative integer paise."
    );
  }

  const ref = rechargePlansCollection().doc(input.id);
  const existing = (await ref.get()).data();
  const now = new Date().toISOString();

  const record: RechargePlanRecord = {
    id: input.id,
    title: input.title.trim(),
    description: input.description.trim(),
    amountPaise: input.amountPaise,
    bonusPaise: input.bonusPaise,
    currency: "INR",
    enabled: input.enabled,
    displayOrder: input.displayOrder,
    promoEligible: input.promoEligible,
    promoLabel: input.promoLabel?.trim() || null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    bonusExpiryDays: input.bonusExpiryDays,
    maxUsesPerInstitute: input.maxUsesPerInstitute,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    updatedByUid: actor.uid,
  };

  await ref.set(record);

  await recordAuditLog({
    action: "RECHARGE_PLAN_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    targetId: record.id,
    metadata: {
      amountPaise: record.amountPaise,
      bonusPaise: record.bonusPaise,
      enabled: record.enabled,
      promoEligible: record.promoEligible,
    },
  });

  return record;
}
