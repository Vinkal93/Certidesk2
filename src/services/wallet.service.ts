import "server-only";
import type { Transaction } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  institutesCollection,
  walletBonusGrantsCollection,
  walletTransactionsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type {
  InstituteRecord,
  InstituteWalletSummary,
  SpendOrderPolicy,
  WalletLedgerType,
  WalletTransactionReason,
  WalletTransactionRecord,
} from "@/types/domain";

export interface DebitWalletParams {
  instituteId: string;
  amountPaise: number;
  reason: WalletTransactionReason;
  ledgerType?: WalletLedgerType;
  referenceId: string;
  idempotencyKey?: string;
  actorUid: string;
  note: string;
  spendOrder?: SpendOrderPolicy;
  metadata?: Record<string, string | number | boolean | null>;
}

export class InsufficientWalletBalanceError extends AuthError {
  readonly requiredPaise: number;
  readonly availablePaise: number;
  readonly shortfallPaise: number;

  constructor(requiredPaise: number, availablePaise: number) {
    const shortfallPaise = Math.max(requiredPaise - availablePaise, 0);
    super(
      402,
      "INSUFFICIENT_WALLET_BALANCE",
      `Insufficient wallet balance. Required ₹${(requiredPaise / 100).toFixed(2)}, available ₹${(availablePaise / 100).toFixed(2)}, shortfall ₹${(shortfallPaise / 100).toFixed(2)}.`
    );
    this.requiredPaise = requiredPaise;
    this.availablePaise = availablePaise;
    this.shortfallPaise = shortfallPaise;
  }
}

/**
 * Resolves paid, promotional bonus, and total spendable balances backward-compatibly
 * for both legacy single-balance institutes and dual-bucket ledger institutes.
 */
export function resolveWalletBuckets(
  institute: Pick<
    InstituteRecord,
    | "walletBalancePaise"
    | "paidBalancePaise"
    | "bonusBalancePaise"
    | "walletVersion"
    | "updatedAt"
  >
): InstituteWalletSummary {
  const bonusBalancePaise =
    typeof institute.bonusBalancePaise === "number"
      ? Math.max(0, Math.trunc(institute.bonusBalancePaise))
      : 0;
  const paidBalancePaise =
    typeof institute.paidBalancePaise === "number"
      ? Math.max(0, Math.trunc(institute.paidBalancePaise))
      : Math.max(0, Math.trunc(institute.walletBalancePaise) - bonusBalancePaise);
  return {
    paidBalancePaise,
    bonusBalancePaise,
    totalSpendableBalancePaise: paidBalancePaise + bonusBalancePaise,
    currency: "INR",
    version: institute.walletVersion ?? 1,
    updatedAt: institute.updatedAt,
  };
}

/**
 * Pure helper to validate and compute next balance in integer paise.
 * Exported for unit testing.
 */
export function computeWalletDebit(
  currentBalancePaise: number,
  debitAmountPaise: number
): number {
  if (!Number.isInteger(currentBalancePaise) || !Number.isInteger(debitAmountPaise)) {
    throw new AuthError(400, "INVALID_AMOUNT", "Monetary amounts must be integer paise.");
  }
  if (debitAmountPaise < 0) {
    throw new AuthError(400, "INVALID_AMOUNT", "Debit amount cannot be negative.");
  }
  if (currentBalancePaise < debitAmountPaise) {
    throw new InsufficientWalletBalanceError(debitAmountPaise, currentBalancePaise);
  }
  return currentBalancePaise - debitAmountPaise;
}

/**
 * Computes bucket-level debit split according to configured spend order
 * (default: `bonus_first`, then `paid`). Never allows negative balances.
 */
export function computeBucketDebit(params: {
  paidBalancePaise: number;
  bonusBalancePaise: number;
  debitAmountPaise: number;
  spendOrder?: SpendOrderPolicy;
}): {
  bonusDebitPaise: number;
  paidDebitPaise: number;
  nextBonusBalancePaise: number;
  nextPaidBalancePaise: number;
  nextTotalBalancePaise: number;
} {
  const { paidBalancePaise, bonusBalancePaise, debitAmountPaise } = params;
  const spendOrder = params.spendOrder ?? "bonus_first";

  if (
    !Number.isInteger(paidBalancePaise) ||
    !Number.isInteger(bonusBalancePaise) ||
    !Number.isInteger(debitAmountPaise)
  ) {
    throw new AuthError(400, "INVALID_AMOUNT", "Monetary amounts must be integer paise.");
  }
  if (paidBalancePaise < 0 || bonusBalancePaise < 0 || debitAmountPaise < 0) {
    throw new AuthError(400, "INVALID_AMOUNT", "Wallet amounts cannot be negative.");
  }

  const totalAvailable = paidBalancePaise + bonusBalancePaise;
  if (totalAvailable < debitAmountPaise) {
    throw new InsufficientWalletBalanceError(debitAmountPaise, totalAvailable);
  }

  let bonusDebitPaise = 0;
  let paidDebitPaise = 0;

  if (spendOrder === "bonus_first") {
    bonusDebitPaise = Math.min(bonusBalancePaise, debitAmountPaise);
    paidDebitPaise = debitAmountPaise - bonusDebitPaise;
  } else {
    paidDebitPaise = Math.min(paidBalancePaise, debitAmountPaise);
    bonusDebitPaise = debitAmountPaise - paidDebitPaise;
  }

  const nextBonusBalancePaise = bonusBalancePaise - bonusDebitPaise;
  const nextPaidBalancePaise = paidBalancePaise - paidDebitPaise;

  return {
    bonusDebitPaise,
    paidDebitPaise,
    nextBonusBalancePaise,
    nextPaidBalancePaise,
    nextTotalBalancePaise: nextPaidBalancePaise + nextBonusBalancePaise,
  };
}

/**
 * Pure helper for refund reconciliation across paid & promotional bonus buckets.
 * Never permits a negative wallet balance.
 */
export function computeRefundReconciliation(params: {
  paidBalancePaise: number;
  bonusBalancePaise: number;
  refundPaidPaise: number;
  associatedBonusPaise: number;
}): {
  paidReversedPaise: number;
  bonusReversedPaise: number;
  unrecoveredPaidShortfallPaise: number;
  unrecoveredBonusConsumedPaise: number;
  nextPaidBalancePaise: number;
  nextBonusBalancePaise: number;
  nextTotalBalancePaise: number;
} {
  const paidReversedPaise = Math.min(
    Math.max(0, params.paidBalancePaise),
    Math.max(0, params.refundPaidPaise)
  );
  const bonusReversedPaise = Math.min(
    Math.max(0, params.bonusBalancePaise),
    Math.max(0, params.associatedBonusPaise)
  );
  const nextPaidBalancePaise = Math.max(0, params.paidBalancePaise - paidReversedPaise);
  const nextBonusBalancePaise = Math.max(
    0,
    params.bonusBalancePaise - bonusReversedPaise
  );

  return {
    paidReversedPaise,
    bonusReversedPaise,
    unrecoveredPaidShortfallPaise: Math.max(
      0,
      params.refundPaidPaise - paidReversedPaise
    ),
    unrecoveredBonusConsumedPaise: Math.max(
      0,
      params.associatedBonusPaise - bonusReversedPaise
    ),
    nextPaidBalancePaise,
    nextBonusBalancePaise,
    nextTotalBalancePaise: nextPaidBalancePaise + nextBonusBalancePaise,
  };
}

function mapReasonToLedgerType(
  reason: WalletTransactionReason,
  direction: "credit" | "debit"
): WalletLedgerType {
  switch (reason) {
    case "razorpay_recharge":
      return "recharge_credit";
    case "promotional_bonus":
      return "promotional_bonus";
    case "student_admission":
      return "admission_debit";
    case "student_profile_update":
      return "profile_edit_debit";
    case "payment_refund":
      return "refund_credit";
    case "promotional_expiry":
      return "promotional_expiry";
    case "manual_adjustment":
    case "initial_balance":
    default:
      return direction === "credit" ? "administrative_credit" : "administrative_debit";
  }
}

export function applyWalletDebitInTransaction(
  tx: Transaction,
  instituteOrBalance:
    | number
    | Pick<
        InstituteRecord,
        | "walletBalancePaise"
        | "paidBalancePaise"
        | "bonusBalancePaise"
        | "walletVersion"
        | "updatedAt"
      >,
  params: DebitWalletParams
): WalletTransactionRecord {
  const buckets =
    typeof instituteOrBalance === "number"
      ? {
          paidBalancePaise: instituteOrBalance,
          bonusBalancePaise: 0,
          totalSpendableBalancePaise: instituteOrBalance,
          version: 1,
        }
      : resolveWalletBuckets(instituteOrBalance);

  const split = computeBucketDebit({
    paidBalancePaise: buckets.paidBalancePaise,
    bonusBalancePaise: buckets.bonusBalancePaise,
    debitAmountPaise: params.amountPaise,
    spendOrder: params.spendOrder ?? "bonus_first",
  });

  const now = new Date().toISOString();
  const txId = generateId("WTX");
  const ledgerType = params.ledgerType ?? mapReasonToLedgerType(params.reason, "debit");

  tx.update(institutesCollection().doc(params.instituteId), {
    walletBalancePaise: split.nextTotalBalancePaise,
    paidBalancePaise: split.nextPaidBalancePaise,
    bonusBalancePaise: split.nextBonusBalancePaise,
    walletVersion: buckets.version + 1,
    updatedAt: now,
  });

  let runningPaid = buckets.paidBalancePaise;
  let runningBonus = buckets.bonusBalancePaise;

  const primaryBucket: "paid" | "bonus" =
    split.bonusDebitPaise > 0 && split.paidDebitPaise === 0 ? "bonus" : "paid";

  const record: WalletTransactionRecord = {
    id: txId,
    instituteId: params.instituteId,
    type: "debit",
    ledgerType,
    bucket: primaryBucket,
    direction: "debit",
    amountPaise: params.amountPaise,
    balanceAfterPaise: split.nextTotalBalancePaise,
    paidBalanceAfterPaise: split.nextPaidBalancePaise,
    bonusBalanceAfterPaise: split.nextBonusBalancePaise,
    reason: params.reason,
    source: params.reason,
    referenceId: params.referenceId,
    ...(params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {}),
    actorUid: params.actorUid,
    note: params.note,
    metadata: {
      ...(params.metadata ?? {}),
      bonusDebitPaise: split.bonusDebitPaise,
      paidDebitPaise: split.paidDebitPaise,
      spendOrder: params.spendOrder ?? "bonus_first",
    },
    createdAt: now,
  };

  if (params.amountPaise > 0) {
    if (split.bonusDebitPaise > 0 && split.paidDebitPaise > 0) {
      runningBonus -= split.bonusDebitPaise;
      const bonusTxId = `${txId}_B`;
      tx.set(walletTransactionsCollection().doc(bonusTxId), {
        ...record,
        id: bonusTxId,
        bucket: "bonus",
        amountPaise: split.bonusDebitPaise,
        balanceAfterPaise: runningPaid + runningBonus,
        paidBalanceAfterPaise: runningPaid,
        bonusBalanceAfterPaise: runningBonus,
        note: `${params.note} (Promotional bonus portion)`,
      });

      runningPaid -= split.paidDebitPaise;
      const paidTxId = `${txId}_P`;
      tx.set(walletTransactionsCollection().doc(paidTxId), {
        ...record,
        id: paidTxId,
        bucket: "paid",
        amountPaise: split.paidDebitPaise,
        balanceAfterPaise: runningPaid + runningBonus,
        paidBalanceAfterPaise: runningPaid,
        bonusBalanceAfterPaise: runningBonus,
        note: `${params.note} (Paid credit portion)`,
      });
    } else {
      tx.set(walletTransactionsCollection().doc(txId), record);
    }
  }

  return record;
}

export async function listInstituteWalletTransactions(
  instituteId: string,
  limitCount = 100
): Promise<WalletTransactionRecord[]> {
  const snap = await walletTransactionsCollection()
    .where("instituteId", "==", instituteId)
    .get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limitCount);
}

export function computeInstituteWalletTotals(transactions: WalletTransactionRecord[]): {
  totalRechargedPaise: number;
  totalBonusGrantedPaise: number;
  totalConsumedPaise: number;
} {
  let totalRechargedPaise = 0;
  let totalBonusGrantedPaise = 0;
  let totalConsumedPaise = 0;

  for (const tx of transactions) {
    if (tx.type === "credit") {
      if (tx.reason === "promotional_bonus" || tx.ledgerType === "promotional_bonus") {
        totalBonusGrantedPaise += tx.amountPaise;
      } else if (
        tx.reason === "razorpay_recharge" ||
        tx.ledgerType === "recharge_credit"
      ) {
        totalRechargedPaise += tx.amountPaise;
      }
    } else if (tx.type === "debit") {
      if (
        tx.reason === "student_admission" ||
        tx.reason === "student_profile_update" ||
        tx.ledgerType === "admission_debit" ||
        tx.ledgerType === "profile_edit_debit"
      ) {
        totalConsumedPaise += tx.amountPaise;
      }
    }
  }

  return {
    totalRechargedPaise,
    totalBonusGrantedPaise,
    totalConsumedPaise,
  };
}

export async function creditInstituteWalletIdempotent(params: {
  instituteId: string;
  amountPaise: number;
  bonusPaise?: number;
  planId?: string | null;
  bonusExpiryDays?: number | null;
  idempotencyDocId: string;
  reason: WalletTransactionReason;
  referenceId: string;
  actorUid: string;
  note: string;
}): Promise<{
  alreadyProcessed: boolean;
  balanceAfterPaise: number;
  paidBalanceAfterPaise: number;
  bonusBalanceAfterPaise: number;
}> {
  if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
    throw new AuthError(
      400,
      "INVALID_AMOUNT",
      "Credit amount must be positive integer paise."
    );
  }
  const bonusPaise = params.bonusPaise ?? 0;
  if (!Number.isInteger(bonusPaise) || bonusPaise < 0) {
    throw new AuthError(
      400,
      "INVALID_AMOUNT",
      "Bonus amount must be non-negative integer paise."
    );
  }

  const db = getAdminFirestore();
  const instRef = institutesCollection().doc(params.instituteId);
  const txRef = walletTransactionsCollection().doc(params.idempotencyDocId);
  const bonusTxId = `${params.idempotencyDocId}_BONUS`;
  const bonusTxRef = walletTransactionsCollection().doc(bonusTxId);
  const grantRef = walletBonusGrantsCollection().doc(bonusTxId);

  const result = await db.runTransaction(async (tx) => {
    const [instSnap, existingTxSnap, existingBonusSnap] = await Promise.all([
      tx.get(instRef),
      tx.get(txRef),
      tx.get(bonusTxRef),
    ]);

    const institute = instSnap.data();
    if (!instSnap.exists || !institute) {
      throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
    }

    const buckets = resolveWalletBuckets(institute);

    if (existingTxSnap.exists) {
      return {
        alreadyProcessed: true,
        balanceAfterPaise: buckets.totalSpendableBalancePaise,
        paidBalanceAfterPaise: buckets.paidBalancePaise,
        bonusBalanceAfterPaise: buckets.bonusBalancePaise,
      };
    }

    const now = new Date().toISOString();
    const nextPaid = buckets.paidBalancePaise + params.amountPaise;
    const applyBonus = bonusPaise > 0 && !existingBonusSnap.exists ? bonusPaise : 0;
    const nextBonus = buckets.bonusBalancePaise + applyBonus;
    const nextTotal = nextPaid + nextBonus;

    tx.update(instRef, {
      walletBalancePaise: nextTotal,
      paidBalancePaise: nextPaid,
      bonusBalancePaise: nextBonus,
      walletVersion: buckets.version + 1,
      updatedAt: now,
    });

    tx.set(txRef, {
      id: params.idempotencyDocId,
      instituteId: params.instituteId,
      type: "credit",
      ledgerType: mapReasonToLedgerType(params.reason, "credit"),
      bucket: "paid",
      direction: "credit",
      amountPaise: params.amountPaise,
      balanceAfterPaise: nextPaid + buckets.bonusBalancePaise,
      paidBalanceAfterPaise: nextPaid,
      bonusBalanceAfterPaise: buckets.bonusBalancePaise,
      reason: params.reason,
      source: params.reason,
      referenceId: params.referenceId,
      idempotencyKey: params.idempotencyDocId,
      actorUid: params.actorUid,
      note: params.note,
      metadata: {
        planId: params.planId ?? null,
        bonusPaise: applyBonus,
      },
      createdAt: now,
    });

    if (applyBonus > 0) {
      const expiresAt =
        params.bonusExpiryDays && params.bonusExpiryDays > 0
          ? new Date(
              Date.now() + params.bonusExpiryDays * 24 * 60 * 60 * 1000
            ).toISOString()
          : null;

      tx.set(bonusTxRef, {
        id: bonusTxId,
        instituteId: params.instituteId,
        type: "credit",
        ledgerType: "promotional_bonus",
        bucket: "bonus",
        direction: "credit",
        amountPaise: applyBonus,
        balanceAfterPaise: nextTotal,
        paidBalanceAfterPaise: nextPaid,
        bonusBalanceAfterPaise: nextBonus,
        reason: "promotional_bonus",
        source: "recharge_promotion",
        referenceId: params.referenceId,
        idempotencyKey: bonusTxId,
        actorUid: params.actorUid,
        note: `Promotional bonus for recharge (${params.referenceId})`,
        metadata: {
          planId: params.planId ?? null,
          expiresAt,
        },
        createdAt: now,
      });

      tx.set(grantRef, {
        id: bonusTxId,
        instituteId: params.instituteId,
        paymentId: params.referenceId,
        orderId: params.idempotencyDocId,
        planId: params.planId ?? "custom",
        grantedPaise: applyBonus,
        remainingPaise: applyBonus,
        expiresAt,
        expired: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      alreadyProcessed: false,
      balanceAfterPaise: nextTotal,
      paidBalanceAfterPaise: nextPaid,
      bonusBalanceAfterPaise: nextBonus,
    };
  });

  if (!result.alreadyProcessed) {
    await recordAuditLog({
      action: "WALLET_CREDITED",
      actorUid: params.actorUid,
      actorRole: "system",
      instituteId: params.instituteId,
      targetId: params.referenceId,
      metadata: {
        amountPaise: params.amountPaise,
        bonusPaise,
        balanceAfterPaise: result.balanceAfterPaise,
      },
    });
    if (bonusPaise > 0) {
      await recordAuditLog({
        action: "WALLET_BONUS_CREDITED",
        actorUid: params.actorUid,
        actorRole: "system",
        instituteId: params.instituteId,
        targetId: params.referenceId,
        metadata: {
          bonusPaise,
          bonusBalanceAfterPaise: result.bonusBalanceAfterPaise,
        },
      });
    }
  }

  return result;
}
