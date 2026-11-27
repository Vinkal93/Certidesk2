import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  institutesCollection,
  walletTransactionsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { recordAuditLog } from "./audit.service";
import { computeBucketDebit, resolveWalletBuckets } from "./wallet.service";
import type { SessionUser } from "@/types/auth";
import type { InstituteWalletSummary, WalletTransactionRecord } from "@/types/domain";

export interface AdjustInstituteWalletInput {
  instituteId: string;
  type: "credit" | "debit";
  amountPaise: number;
  reason: string;
  reference?: string | undefined;
  internalNote?: string | undefined;
  idempotencyKey: string;
  actorUid: string;
}

export interface WalletReconciliationDiscrepancy {
  instituteId: string;
  instituteName: string;
  projectedTotalPaise: number;
  projectedPaidPaise: number;
  projectedBonusPaise: number;
  ledgerComputedTotalPaise: number;
  discrepancyPaise: number;
  issues: string[];
  transactionCount: number;
}

/**
 * Pure computation helper for manual credit/debit across dual buckets.
 * Exported for unit testing.
 */
export function computeManualWalletAdjustment(params: {
  paidBalancePaise: number;
  bonusBalancePaise: number;
  type: "credit" | "debit";
  amountPaise: number;
}): {
  balanceBeforePaise: number;
  balanceAfterPaise: number;
  nextPaidBalancePaise: number;
  nextBonusBalancePaise: number;
} {
  const { paidBalancePaise, bonusBalancePaise, type, amountPaise } = params;
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AuthError(
      400,
      "INVALID_AMOUNT",
      "Adjustment amount must be a positive integer in paise."
    );
  }
  const MAX_SINGLE_ADJUSTMENT_PAISE = 50_000_000; // ₹5,00,000 safety cap
  if (amountPaise > MAX_SINGLE_ADJUSTMENT_PAISE) {
    throw new AuthError(
      400,
      "ADJUSTMENT_LIMIT_EXCEEDED",
      "Single manual adjustment cannot exceed ₹5,00,000."
    );
  }

  const balanceBeforePaise = paidBalancePaise + bonusBalancePaise;
  if (type === "credit") {
    const nextPaidBalancePaise = paidBalancePaise + amountPaise;
    const nextBonusBalancePaise = bonusBalancePaise;
    return {
      balanceBeforePaise,
      balanceAfterPaise: nextPaidBalancePaise + nextBonusBalancePaise,
      nextPaidBalancePaise,
      nextBonusBalancePaise,
    };
  }

  const debitSplit = computeBucketDebit({
    paidBalancePaise,
    bonusBalancePaise,
    debitAmountPaise: amountPaise,
    spendOrder: "bonus_first",
  });

  return {
    balanceBeforePaise,
    balanceAfterPaise: debitSplit.nextTotalBalancePaise,
    nextPaidBalancePaise: debitSplit.nextPaidBalancePaise,
    nextBonusBalancePaise: debitSplit.nextBonusBalancePaise,
  };
}

/**
 * Authoritative Super Admin manual wallet adjustment.
 * Atomically updates `paidBalancePaise`, `bonusBalancePaise`, `walletBalancePaise`,
 * `walletVersion`, and writes an immutable `walletTransactions` ledger record.
 */
export async function adjustInstituteWallet(
  actor: SessionUser,
  input: AdjustInstituteWalletInput
): Promise<{
  alreadyProcessed: boolean;
  transaction: WalletTransactionRecord;
  summary: InstituteWalletSummary;
}> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
  if (!input.reason || input.reason.trim().length < 5) {
    throw new AuthError(
      400,
      "REASON_REQUIRED",
      "A clear audit reason (min 5 characters) is required."
    );
  }
  if (!input.idempotencyKey || input.idempotencyKey.trim().length < 4) {
    throw new AuthError(400, "IDEMPOTENCY_REQUIRED", "Idempotency key is required.");
  }

  const db = getAdminFirestore();
  const instRef = institutesCollection().doc(input.instituteId);
  const safeIdem = input.idempotencyKey.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  const txDocId = `ADJ_${input.instituteId}_${safeIdem}`;
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

    const currentBuckets = resolveWalletBuckets(institute);

    if (existingTxSnap.exists && existingTxSnap.data()) {
      return {
        alreadyProcessed: true,
        transaction: existingTxSnap.data()!,
        summary: currentBuckets,
      };
    }

    const computed = computeManualWalletAdjustment({
      paidBalancePaise: currentBuckets.paidBalancePaise,
      bonusBalancePaise: currentBuckets.bonusBalancePaise,
      type: input.type,
      amountPaise: input.amountPaise,
    });

    const now = new Date().toISOString();
    const nextVersion = (institute.walletVersion ?? 1) + 1;
    const noteParts = [input.reason.trim()];
    if (input.internalNote?.trim()) {
      noteParts.push(`Note: ${input.internalNote.trim()}`);
    }

    const record: WalletTransactionRecord = {
      id: txDocId,
      instituteId: institute.id,
      type: input.type,
      ledgerType:
        input.type === "credit" ? "administrative_credit" : "administrative_debit",
      bucket: "paid",
      direction: input.type,
      amountPaise: input.amountPaise,
      balanceBeforePaise: computed.balanceBeforePaise,
      balanceAfterPaise: computed.balanceAfterPaise,
      paidBalanceAfterPaise: computed.nextPaidBalancePaise,
      bonusBalanceAfterPaise: computed.nextBonusBalancePaise,
      currency: "INR",
      source: "super_admin_manual",
      reason: "manual_adjustment",
      referenceId: input.reference?.trim() || input.idempotencyKey.trim(),
      reference: input.reference?.trim() || null,
      idempotencyKey: input.idempotencyKey.trim(),
      status: "completed",
      actorUid: input.actorUid || actor.uid,
      note: noteParts.join(" | "),
      createdAt: now,
    };

    tx.update(instRef, {
      walletBalancePaise: computed.balanceAfterPaise,
      paidBalancePaise: computed.nextPaidBalancePaise,
      bonusBalancePaise: computed.nextBonusBalancePaise,
      walletVersion: nextVersion,
      updatedAt: now,
    });
    tx.set(txRef, record);

    return {
      alreadyProcessed: false,
      transaction: record,
      summary: {
        paidBalancePaise: computed.nextPaidBalancePaise,
        bonusBalancePaise: computed.nextBonusBalancePaise,
        totalSpendableBalancePaise: computed.balanceAfterPaise,
        currency: "INR" as const,
        version: nextVersion,
        updatedAt: now,
      },
    };
  });

  if (!result.alreadyProcessed) {
    await recordAuditLog({
      action: input.type === "credit" ? "WALLET_CREDITED" : "WALLET_DEBITED",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId: input.instituteId,
      targetId: txDocId,
      metadata: {
        amountPaise: input.amountPaise,
        balanceBeforePaise: result.transaction.balanceBeforePaise ?? 0,
        balanceAfterPaise: result.transaction.balanceAfterPaise,
        reference: input.reference?.trim() || null,
        reason: input.reason.trim(),
      },
    });
  }

  return result;
}

/**
 * Non-destructive wallet reconciliation service.
 * Detects ledger mismatches, negative balances, bucket drift, and duplicate idempotency keys.
 */
export async function reconcileInstituteWallets(
  actor: SessionUser,
  instituteId?: string
): Promise<{
  checkedAt: string;
  totalInstitutesChecked: number;
  discrepancies: WalletReconciliationDiscrepancy[];
}> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }

  const instSnap = instituteId
    ? await institutesCollection().where("id", "==", instituteId).get()
    : await institutesCollection().get();

  const txSnap = instituteId
    ? await walletTransactionsCollection().where("instituteId", "==", instituteId).get()
    : await walletTransactionsCollection().get();

  const txsByInst = new Map<string, WalletTransactionRecord[]>();
  for (const doc of txSnap.docs) {
    const tx = doc.data();
    const list = txsByInst.get(tx.instituteId) ?? [];
    list.push(tx);
    txsByInst.set(tx.instituteId, list);
  }

  const discrepancies: WalletReconciliationDiscrepancy[] = [];

  for (const doc of instSnap.docs) {
    const inst = doc.data();
    const buckets = resolveWalletBuckets(inst);
    const txs = txsByInst.get(inst.id) ?? [];

    let ledgerComputedTotalPaise = 0;
    const seenKeys = new Set<string>();
    const issues: string[] = [];

    for (const tx of txs) {
      if (tx.idempotencyKey) {
        if (seenKeys.has(tx.idempotencyKey)) {
          issues.push(`Duplicate idempotencyKey detected: ${tx.idempotencyKey}`);
        }
        seenKeys.add(tx.idempotencyKey);
      }
      if (tx.type === "credit") {
        ledgerComputedTotalPaise += tx.amountPaise;
      } else if (tx.type === "debit") {
        ledgerComputedTotalPaise -= tx.amountPaise;
      }
    }

    if (
      inst.walletBalancePaise < 0 ||
      buckets.paidBalancePaise < 0 ||
      buckets.bonusBalancePaise < 0
    ) {
      issues.push("Negative wallet balance detected.");
    }
    if (inst.walletBalancePaise !== buckets.totalSpendableBalancePaise) {
      issues.push(
        `Bucket projection drift: walletBalancePaise (${inst.walletBalancePaise}) != paid+bonus (${buckets.totalSpendableBalancePaise}).`
      );
    }

    const discrepancyPaise =
      buckets.totalSpendableBalancePaise - ledgerComputedTotalPaise;
    if (txs.length > 0 && discrepancyPaise !== 0) {
      issues.push(
        `Balance vs ledger mismatch of ₹${(discrepancyPaise / 100).toFixed(2)}.`
      );
    }

    if (issues.length > 0) {
      discrepancies.push({
        instituteId: inst.id,
        instituteName: inst.name,
        projectedTotalPaise: buckets.totalSpendableBalancePaise,
        projectedPaidPaise: buckets.paidBalancePaise,
        projectedBonusPaise: buckets.bonusBalancePaise,
        ledgerComputedTotalPaise,
        discrepancyPaise,
        issues,
        transactionCount: txs.length,
      });
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    totalInstitutesChecked: instSnap.size,
    discrepancies,
  };
}
