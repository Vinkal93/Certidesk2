import "server-only";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
  institutesCollection,
  loginMappingsCollection,
  usersCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId, generateInstituteCode } from "@/lib/utils/ids";
import { getEffectivePlatformPricing } from "./su-platform.service";
import { recordAuditLog } from "./audit.service";
import { ensureDefaultInstituteAccounts } from "./institute-finance.service";
import type { PublicRegisterInput } from "@/lib/validation/registration";
import type { SessionUser } from "@/types/auth";
import type { InstituteRecord, OnboardingStatus } from "@/types/domain";

export interface PublicRegistrationResult {
  institute: InstituteRecord;
  instituteCode: string;
  loginEmail: string;
}

/**
 * Pure helper to check whether a registration conflicts with existing institutes.
 * Exported for unit testing.
 */
export function detectDuplicateInstitute(
  existingInstitutes: Array<Pick<InstituteRecord, "email" | "phone" | "name">>,
  candidate: { email: string; phone: string; instituteName: string }
): { duplicate: boolean; reason?: string } {
  const email = candidate.email.trim().toLowerCase();
  const phone = candidate.phone.trim();
  const name = candidate.instituteName.trim().toLowerCase();

  for (const inst of existingInstitutes) {
    if (inst.email.trim().toLowerCase() === email) {
      return {
        duplicate: true,
        reason: "An institute is already registered with this email address.",
      };
    }
    if (inst.phone.trim() === phone) {
      return {
        duplicate: true,
        reason: "An institute is already registered with this mobile number.",
      };
    }
    if (inst.name.trim().toLowerCase() === name) {
      return {
        duplicate: true,
        reason: "An institute with this exact name is already registered.",
      };
    }
  }
  return { duplicate: false };
}

/**
 * Public self-registration for a new Institute + Owner (`institute_admin`).
 * Never trusts client-supplied role, instituteId, or wallet balance.
 * Initializes wallet at 0 paise (`paidBalancePaise: 0`, `bonusBalancePaise: 0`).
 */
export async function registerPublicInstitute(
  input: PublicRegisterInput
): Promise<PublicRegistrationResult> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const [existingInstSnap, existingUserSnap] = await Promise.all([
    institutesCollection().get(),
    usersCollection().where("email", "==", normalizedEmail).get(),
  ]);

  if (!existingUserSnap.empty) {
    throw new AuthError(
      409,
      "EMAIL_ALREADY_REGISTERED",
      "An account with this email address already exists."
    );
  }

  const dupCheck = detectDuplicateInstitute(
    existingInstSnap.docs.map((d) => d.data()),
    {
      email: normalizedEmail,
      phone: input.phone,
      instituteName: input.instituteName,
    }
  );
  if (dupCheck.duplicate) {
    throw new AuthError(
      409,
      "DUPLICATE_INSTITUTE",
      dupCheck.reason ?? "Duplicate institute registration detected."
    );
  }

  const auth = getAdminAuth();
  const db = getAdminFirestore();
  const instituteId = generateId("INST");
  const instituteCode = generateInstituteCode(input.instituteName);
  const pricing = await getEffectivePlatformPricing();

  let createdUid: string | null = null;

  try {
    const authUser = await auth
      .createUser({
        email: normalizedEmail,
        password: input.password,
        displayName: input.ownerName,
        disabled: false,
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("email-already-exists")) {
          throw new AuthError(
            409,
            "EMAIL_ALREADY_REGISTERED",
            "An account with this email address already exists."
          );
        }
        throw err;
      });

    createdUid = authUser.uid;

    // Only trusted server-side code assigns institute_admin role and instituteId
    await auth.setCustomUserClaims(createdUid, {
      role: "institute_admin",
      instituteId,
      studentId: null,
      permissions: [],
      mustChangePassword: false,
    });

    const now = new Date().toISOString();
    const instituteRecord: InstituteRecord = {
      id: instituteId,
      code: instituteCode,
      name: input.instituteName.trim(),
      ownerName: input.ownerName.trim(),
      phone: input.phone.trim(),
      email: normalizedEmail,
      address: input.address.trim(),
      adminUid: createdUid,
      status: "active",
      onboardingStatus: "registered",
      emailVerified: false,
      mobileVerified: false,
      walletBalancePaise: 0,
      paidBalancePaise: 0,
      bonusBalancePaise: 0,
      walletVersion: 1,
      pricing: {
        admissionFeePaise: pricing.admissionFeePaise,
        profileUpdateFeePaise: pricing.profileUpdateFeePaise,
        certificateFeePaise: pricing.certificateFeePaise,
      },
      createdAt: now,
      updatedAt: now,
    };

    await db.runTransaction(async (tx) => {
      tx.set(institutesCollection().doc(instituteId), instituteRecord);

      tx.set(usersCollection().doc(createdUid!), {
        uid: createdUid!,
        email: normalizedEmail,
        displayName: input.ownerName.trim(),
        role: "institute_admin",
        instituteId,
        studentId: null,
        permissions: [],
        disabled: false,
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      });

      tx.set(loginMappingsCollection().doc(`institute_${instituteCode}`), {
        identifier: instituteCode,
        portal: "institute",
        uid: createdUid!,
        authEmail: normalizedEmail,
        instituteId,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    });

    await ensureDefaultInstituteAccounts(instituteId).catch(() => undefined);

    await recordAuditLog({
      action: "INSTITUTE_SELF_REGISTERED",
      actorUid: createdUid,
      actorRole: "institute_admin",
      instituteId,
      targetId: instituteId,
      metadata: {
        instituteCode,
        email: normalizedEmail,
        onboardingStatus: "registered",
      },
    });

    return {
      institute: instituteRecord,
      instituteCode,
      loginEmail: normalizedEmail,
    };
  } catch (error) {
    if (createdUid) {
      await auth.deleteUser(createdUid).catch(() => undefined);
    }
    throw error;
  }
}

export async function updateInstituteOnboardingStatus(
  actor: SessionUser,
  action: "mark_verified" | "skip_wallet" | "complete"
): Promise<{ onboardingStatus: OnboardingStatus }> {
  if (actor.role !== "institute_admin" || !actor.instituteId) {
    throw new AuthError(403, "FORBIDDEN", "Institute Admin access required.");
  }

  const instRef = institutesCollection().doc(actor.instituteId);
  const snap = await instRef.get();
  const inst = snap.data();
  if (!snap.exists || !inst) {
    throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
  }

  const nextStatus: OnboardingStatus =
    action === "mark_verified"
      ? "verified"
      : action === "skip_wallet"
        ? "wallet_skipped"
        : "completed";

  const now = new Date().toISOString();
  await instRef.update({
    onboardingStatus: nextStatus,
    ...(action === "mark_verified" ? { emailVerified: true, mobileVerified: true } : {}),
    updatedAt: now,
  });

  await recordAuditLog({
    action: "INSTITUTE_ONBOARDING_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: actor.instituteId,
    targetId: actor.instituteId,
    metadata: { action, onboardingStatus: nextStatus },
  });

  return { onboardingStatus: nextStatus };
}
