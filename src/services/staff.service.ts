import "server-only";
import { getAdminAuth } from "@/lib/firebase/admin";
import { usersCollection } from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateTemporaryPassword } from "@/lib/utils/password";
import { recordAuditLog } from "./audit.service";
import type { CreateStaffInput } from "@/lib/validation/student";
import type { SessionUser } from "@/types/auth";
import type { UserProfileRecord } from "@/types/domain";

export async function listInstituteStaff(
  actor: SessionUser
): Promise<UserProfileRecord[]> {
  if (!hasStaffPermission(actor, "staff:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing staff:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await usersCollection()
    .where("instituteId", "==", institute.id)
    .where("role", "==", "staff")
    .get();
  return snap.docs.map((d) => d.data());
}

export async function createInstituteStaffMember(
  actor: SessionUser,
  input: CreateStaffInput
): Promise<{ staff: UserProfileRecord; temporaryPassword: string }> {
  if (actor.role !== "institute_admin" && !hasStaffPermission(actor, "staff:write")) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      "Only Institute Admin or authorized staff can create staff accounts."
    );
  }

  const institute = await resolveAuthorizedInstitute(actor);
  const normalizedEmail = input.email.toLowerCase();
  const temporaryPassword = generateTemporaryPassword(12);
  const auth = getAdminAuth();

  let createdUid: string | null = null;
  try {
    const authUser = await auth.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      displayName: input.displayName,
      disabled: false,
    });
    createdUid = authUser.uid;

    await auth.setCustomUserClaims(createdUid, {
      role: "staff",
      instituteId: institute.id,
      studentId: null,
      permissions: input.permissions,
      mustChangePassword: true,
    });

    const now = new Date().toISOString();
    const record: UserProfileRecord = {
      uid: createdUid,
      email: normalizedEmail,
      displayName: input.displayName,
      role: "staff",
      instituteId: institute.id,
      studentId: null,
      permissions: input.permissions,
      disabled: false,
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    };

    await usersCollection().doc(createdUid).set(record);
    return { staff: record, temporaryPassword };
  } catch (error) {
    if (createdUid) {
      await auth.deleteUser(createdUid).catch(() => undefined);
    }
    throw error;
  }
}

export async function toggleStaffAccountStatus(
  actor: SessionUser,
  staffUid: string,
  disabled: boolean
): Promise<UserProfileRecord> {
  if (actor.role !== "institute_admin") {
    throw new AuthError(403, "FORBIDDEN", "Only Institute Admin can suspend staff.");
  }

  const institute = await resolveAuthorizedInstitute(actor);
  const ref = usersCollection().doc(staffUid);
  const snap = await ref.get();
  const existing = snap.data();

  if (
    !snap.exists ||
    !existing ||
    existing.instituteId !== institute.id ||
    existing.role !== "staff"
  ) {
    throw new AuthError(404, "STAFF_NOT_FOUND", "Staff member not found.");
  }

  const auth = getAdminAuth();
  await auth.updateUser(staffUid, { disabled });
  if (disabled) {
    await auth.revokeRefreshTokens(staffUid);
  }

  const now = new Date().toISOString();
  await ref.update({ disabled, updatedAt: now });

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: staffUid,
    metadata: { staffDisabled: disabled },
  });

  return { ...existing, disabled, updatedAt: now };
}
