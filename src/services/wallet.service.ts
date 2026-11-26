import "server-only";
import type { Transaction } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  institutesCollection,
  walletTransactionsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { WalletTransactionReason, WalletTransactionRecord } from "@/types/domain";

export interface DebitWalletParams {
  instituteId: string;
  amountPaise: number;
  reason: WalletTransactionReason;
  referenceId: string;
  actorUid: string;
  note: string;
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
    throw new AuthError(
      402,
      "INSUFFICIENT_WALLET_BALANCE",
      "Insufficient institute wallet balance for this operation."
    );
  }
  return currentBalancePaise - debitAmountPaise;
}

export function applyWalletDebitInTransaction(
  tx: Transaction,
  currentBalancePaise: number,
  params: DebitWalletParams
): WalletTransactionRecord {
  const nextBalance = computeWalletDebit(currentBalancePaise, params.amountPaise);
  const now = new Date().toISOString();
  const txId = generateId("WTX");

  tx.update(institutesCollection().doc(params.instituteId), {
    walletBalancePaise: nextBalance,
    updatedAt: now,
  });

  const record: WalletTransactionRecord = {
    id: txId,
    instituteId: params.instituteId,
    type: "debit",
    amountPaise: params.amountPaise,
    balanceAfterPaise: nextBalance,
    reason: params.reason,
    referenceId: params.referenceId,
    actorUid: params.actorUid,
    note: params.note,
    createdAt: now,
  };

  if (params.amountPaise > 0) {
    tx.set(walletTransactionsCollection().doc(txId), record);
  }

  return record;
}

export async function listInstituteWalletTransactions(
  instituteId: string
): Promise<WalletTransactionRecord[]> {
  const snap = await walletTransactionsCollection()
    .where("instituteId", "==", instituteId)
    .get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
}

export async function creditInstituteWalletIdempotent(params: {
  instituteId: string;
  amountPaise: number;
  idempotencyDocId: string;
  reason: WalletTransactionReason;
  referenceId: string;
  actorUid: string;
  note: string;
}): Promise<{ alreadyProcessed: boolean; balanceAfterPaise: number }> {
  if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
    throw new AuthError(
      400,
      "INVALID_AMOUNT",
      "Credit amount must be positive integer paise."
    );
  }

  const db = getAdminFirestore();
  const instRef = institutesCollection().doc(params.instituteId);
  const txRef = walletTransactionsCollection().doc(params.idempotencyDocId);

  const result = await db.runTransaction(async (tx) => {
    const [instSnap, existingTxSnap] = await Promise.all([
      tx.get(instRef),
      tx.get(txRef),
    ]);

    const institute = instSnap.data();
    if (!instSnap.exists || !institute) {
      throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
    }

    if (existingTxSnap.exists) {
      return {
        alreadyProcessed: true,
        balanceAfterPaise: institute.walletBalancePaise,
      };
    }

    const nextBalance = institute.walletBalancePaise + params.amountPaise;
    const now = new Date().toISOString();

    tx.update(instRef, {
      walletBalancePaise: nextBalance,
      updatedAt: now,
    });

    tx.set(txRef, {
      id: params.idempotencyDocId,
      instituteId: params.instituteId,
      type: "credit",
      amountPaise: params.amountPaise,
      balanceAfterPaise: nextBalance,
      reason: params.reason,
      referenceId: params.referenceId,
      actorUid: params.actorUid,
      note: params.note,
      createdAt: now,
    });

    return {
      alreadyProcessed: false,
      balanceAfterPaise: nextBalance,
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
        balanceAfterPaise: result.balanceAfterPaise,
      },
    });
  }

  return result;
}
