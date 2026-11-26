import "server-only";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
  auditLogsCollection,
  institutesCollection,
  loginMappingsCollection,
  usersCollection,
  walletTransactionsCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId, generateInstituteCode } from "@/lib/utils/ids";
import { generateTemporaryPassword } from "@/lib/utils/password";
import { recordAuditLog } from "./audit.service";
import type {
  CreateInstituteInput,
  UpdateInstituteInput,
} from "@/lib/validation/institute";
import type {
  AuditLogRecord,
  InstituteRecord,
  WalletTransactionRecord,
} from "@/types/domain";
import type { SessionUser } from "@/types/auth";

export interface InstituteDirectoryFilter {
  search?: string | undefined;
  status?: "all" | "active" | "suspended" | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface CreateInstituteResult {
  institute: InstituteRecord;
  credentials: {
    instituteCode: string;
    loginEmail: string;
    temporaryPassword: string;
  };
}

export async function listInstitutes(filter: InstituteDirectoryFilter = {}) {
  const snapshot = await institutesCollection().orderBy("createdAt", "desc").get();
  let items = snapshot.docs.map((doc) => doc.data());

  if (filter.status && filter.status !== "all") {
    items = items.filter((item) => item.status === filter.status);
  }

  if (filter.search) {
    const q = filter.search.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q)
    );
  }

  const pageSize = Math.min(Math.max(filter.pageSize ?? 10, 1), 50);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(Math.max(filter.page ?? 1, 1), totalPages);
  const offset = (page - 1) * pageSize;

  return {
    items: items.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getInstituteById(id: string): Promise<InstituteRecord> {
  const snap = await institutesCollection().doc(id).get();
  const data = snap.data();
  if (!snap.exists || !data) {
    throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
  }
  return data;
}

export async function getInstituteTransactions(
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

export async function listAuditLogs(actionFilter?: string): Promise<AuditLogRecord[]> {
  if (actionFilter) {
    const snap = await auditLogsCollection()
      .where("action", "==", actionFilter)
      .get();
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100);
  }
  const snap = await auditLogsCollection().orderBy("createdAt", "desc").limit(100).get();
  return snap.docs.map((d) => d.data());
}

export async function createInstituteWithAdmin(
  actor: SessionUser,
  input: CreateInstituteInput
): Promise<CreateInstituteResult> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Only Super Admin can register institutes.");
  }

  const normalizedEmail = input.email.toLowerCase();

  // Duplicate check by email or phone
  const [dupEmail, dupPhone] = await Promise.all([
    institutesCollection().where("email", "==", normalizedEmail).limit(1).get(),
    institutesCollection().where("phone", "==", input.phone).limit(1).get(),
  ]);

  if (!dupEmail.empty) {
    throw new AuthError(
      409,
      "DUPLICATE_EMAIL",
      "An institute with this email already exists."
    );
  }
  if (!dupPhone.empty) {
    throw new AuthError(
      409,
      "DUPLICATE_PHONE",
      "An institute with this phone number already exists."
    );
  }

  const temporaryPassword =
    input.passwordMode === "manual" &&
    input.manualPassword &&
    input.manualPassword.length >= 8
      ? input.manualPassword
      : generateTemporaryPassword(12);

  const instituteId = generateId("INST");
  const instituteCode = generateInstituteCode(input.name);
  const initialWalletPaise = Math.round(input.initialWalletRupees * 100);
  const now = new Date().toISOString();

  const auth = getAdminAuth();
  const db = getAdminFirestore();

  let createdUid: string | null = null;

  try {
    const authUser = await auth.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      displayName: input.ownerName,
      disabled: input.status === "suspended",
    });
    createdUid = authUser.uid;

    await auth.setCustomUserClaims(createdUid, {
      role: "institute_admin",
      instituteId,
      studentId: null,
      permissions: [],
      mustChangePassword: true,
    });

    const instituteRecord: InstituteRecord = {
      id: instituteId,
      code: instituteCode,
      name: input.name,
      ownerName: input.ownerName,
      phone: input.phone,
      email: normalizedEmail,
      address: input.address,
      adminUid: createdUid,
      status: input.status,
      walletBalancePaise: initialWalletPaise,
      pricing: {
        admissionFeePaise: Math.round(input.admissionFeeRupees * 100),
        profileUpdateFeePaise: Math.round(input.profileUpdateFeeRupees * 100),
        certificateFeePaise: Math.round(input.certificateFeeRupees * 100),
      },
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(institutesCollection().doc(instituteId), instituteRecord);

    batch.set(usersCollection().doc(createdUid), {
      uid: createdUid,
      email: normalizedEmail,
      displayName: input.ownerName,
      role: "institute_admin",
      instituteId,
      studentId: null,
      permissions: [],
      disabled: input.status === "suspended",
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(loginMappingsCollection().doc(`institute_${instituteCode}`), {
      identifier: instituteCode,
      portal: "institute",
      uid: createdUid,
      authEmail: normalizedEmail,
      instituteId,
      active: input.status === "active",
      createdAt: now,
      updatedAt: now,
    });

    if (initialWalletPaise > 0) {
      const txId = generateId("WTX");
      batch.set(walletTransactionsCollection().doc(txId), {
        id: txId,
        instituteId,
        type: "credit",
        amountPaise: initialWalletPaise,
        balanceAfterPaise: initialWalletPaise,
        reason: "initial_balance",
        referenceId: instituteId,
        actorUid: actor.uid,
        note: "Initial wallet balance provisioned on institute registration",
        createdAt: now,
      });
    }

    await batch.commit();

    await recordAuditLog({
      action: "INSTITUTE_CREATED",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId,
      targetId: instituteId,
      metadata: {
        code: instituteCode,
        initialWalletPaise,
        status: input.status,
      },
    });

    return {
      institute: instituteRecord,
      credentials: {
        instituteCode,
        loginEmail: normalizedEmail,
        temporaryPassword,
      },
    };
  } catch (error) {
    // Compensating cleanup if Firestore batch fails after Auth user creation
    if (createdUid) {
      await auth.deleteUser(createdUid).catch(() => undefined);
    }
    throw error;
  }
}

export async function updateInstituteDetails(
  actor: SessionUser,
  instituteId: string,
  input: UpdateInstituteInput
): Promise<InstituteRecord> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Only Super Admin can update institutes.");
  }

  const ref = institutesCollection().doc(instituteId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing) {
    throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
  }

  const updated: InstituteRecord = {
    ...existing,
    name: input.name,
    ownerName: input.ownerName,
    phone: input.phone,
    address: input.address,
    pricing: {
      admissionFeePaise: Math.round(input.admissionFeeRupees * 100),
      profileUpdateFeePaise: Math.round(input.profileUpdateFeeRupees * 100),
      certificateFeePaise: Math.round(input.certificateFeeRupees * 100),
    },
    updatedAt: new Date().toISOString(),
  };

  await ref.set(updated);

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId,
    targetId: instituteId,
  });

  return updated;
}

export async function setInstituteStatus(
  actor: SessionUser,
  instituteId: string,
  nextStatus: "active" | "suspended"
): Promise<InstituteRecord> {
  if (actor.role !== "super_admin") {
    throw new AuthError(
      403,
      "FORBIDDEN",
      "Only Super Admin can change institute status."
    );
  }

  const ref = institutesCollection().doc(instituteId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing) {
    throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
  }

  const now = new Date().toISOString();
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  await auth.updateUser(existing.adminUid, {
    disabled: nextStatus === "suspended",
  });
  if (nextStatus === "suspended") {
    await auth.revokeRefreshTokens(existing.adminUid);
  }

  const batch = db.batch();
  batch.update(ref, { status: nextStatus, updatedAt: now });
  batch.update(usersCollection().doc(existing.adminUid), {
    disabled: nextStatus === "suspended",
    updatedAt: now,
  });
  batch.update(loginMappingsCollection().doc(`institute_${existing.code}`), {
    active: nextStatus === "active",
    updatedAt: now,
  });
  await batch.commit();

  await recordAuditLog({
    action: nextStatus === "suspended" ? "INSTITUTE_SUSPENDED" : "INSTITUTE_ACTIVATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId,
    targetId: instituteId,
  });

  return { ...existing, status: nextStatus, updatedAt: now };
}

export async function resetInstituteAdminAccess(
  actor: SessionUser,
  instituteId: string
): Promise<{ instituteCode: string; temporaryPassword: string }> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Only Super Admin can reset access.");
  }

  const existing = await getInstituteById(instituteId);
  const temporaryPassword = generateTemporaryPassword(12);
  const auth = getAdminAuth();

  await auth.updateUser(existing.adminUid, {
    password: temporaryPassword,
    disabled: false,
  });
  await auth.setCustomUserClaims(existing.adminUid, {
    role: "institute_admin",
    instituteId: existing.id,
    studentId: null,
    permissions: [],
    mustChangePassword: true,
  });
  await auth.revokeRefreshTokens(existing.adminUid);

  const now = new Date().toISOString();
  await usersCollection().doc(existing.adminUid).update({
    mustChangePassword: true,
    disabled: false,
    updatedAt: now,
  });

  await recordAuditLog({
    action: "INSTITUTE_ACCESS_RESET",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId,
    targetId: existing.adminUid,
  });

  return {
    instituteCode: existing.code,
    temporaryPassword,
  };
}
