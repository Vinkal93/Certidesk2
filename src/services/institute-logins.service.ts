import "server-only";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  loginMappingsCollection,
  studentsCollection,
  usersCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";

export interface InstituteLoginMember {
  uid: string;
  displayName: string;
  email: string;
  phone: string | null;
  studentId: string | null;
  studentCode: string | null;
  role: "student" | "staff";
  disabled: boolean;
  mustChangePassword: boolean;
  updatedAt: string;
}

function assertInstituteManager(actor: SessionUser): string {
  if (actor.role !== "institute_admin" && actor.role !== "staff") {
    throw new AuthError(403, "FORBIDDEN", "Institute authorization required.");
  }
  if (!actor.instituteId) {
    throw new AuthError(400, "INSTITUTE_MISSING", "Institute context missing.");
  }
  return actor.instituteId;
}

export async function listInstituteLogins(
  actor: SessionUser
): Promise<InstituteLoginMember[]> {
  const instituteId = assertInstituteManager(actor);

  const [usersSnap, studentsSnap] = await Promise.all([
    usersCollection().where("instituteId", "==", instituteId).get(),
    studentsCollection().where("instituteId", "==", instituteId).get(),
  ]);

  const studentByUid = new Map<
    string,
    { id: string; studentCode: string; phone: string }
  >();
  for (const doc of studentsSnap.docs) {
    const s = doc.data();
    studentByUid.set(s.uid, {
      id: s.id,
      studentCode: s.studentCode,
      phone: s.phone,
    });
  }

  return usersSnap.docs
    .map((d) => d.data())
    .filter((u) => u.role === "student" || u.role === "staff")
    .map((u) => {
      const stu = studentByUid.get(u.uid);
      return {
        uid: u.uid,
        displayName: u.displayName || u.email,
        email: u.email,
        phone: stu?.phone ?? null,
        studentId: u.studentId ?? stu?.id ?? null,
        studentCode: stu?.studentCode ?? null,
        role: u.role as "student" | "staff",
        disabled: Boolean(u.disabled),
        mustChangePassword: Boolean(u.mustChangePassword),
        updatedAt: u.updatedAt,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function updateInstituteMemberLogin(
  actor: SessionUser,
  input: {
    uid: string;
    newEmail?: string | undefined;
    newPassword?: string | undefined;
    disabled?: boolean | undefined;
    requireChangeOnNextLogin?: boolean | undefined;
  }
): Promise<{ uid: string; updatedFields: string[] }> {
  const instituteId = assertInstituteManager(actor);

  const userRef = usersCollection().doc(input.uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new AuthError(404, "USER_NOT_FOUND", "User account not found.");
  }
  const target = userSnap.data()!;

  if (target.instituteId !== instituteId) {
    throw new AuthError(
      403,
      "CROSS_INSTITUTE_DENIED",
      "You can only manage login credentials for your own institute."
    );
  }
  if (target.role !== "student" && target.role !== "staff") {
    throw new AuthError(
      403,
      "ROLE_PROTECTED",
      "Only student and staff login credentials can be managed here."
    );
  }

  const now = new Date().toISOString();
  const auth = getAdminAuth();
  const updatedFields: string[] = [];
  const authUpdates: {
    email?: string;
    password?: string;
    disabled?: boolean;
  } = {};
  const profileUpdates: Record<string, unknown> = { updatedAt: now };

  const normalizedEmail = input.newEmail?.trim().toLowerCase();
  if (normalizedEmail && normalizedEmail !== target.email.toLowerCase()) {
    authUpdates.email = normalizedEmail;
    profileUpdates.email = normalizedEmail;
    updatedFields.push("email");
  }

  if (input.newPassword && input.newPassword.length >= 6) {
    authUpdates.password = input.newPassword;
    profileUpdates.mustChangePassword = Boolean(input.requireChangeOnNextLogin);
    updatedFields.push("password");
  }

  if (
    typeof input.disabled === "boolean" &&
    input.disabled !== Boolean(target.disabled)
  ) {
    authUpdates.disabled = input.disabled;
    profileUpdates.disabled = input.disabled;
    updatedFields.push(input.disabled ? "blocked" : "activated");
  }

  if (updatedFields.length === 0) {
    throw new AuthError(400, "NO_CHANGES", "No credential changes specified.");
  }

  await auth.updateUser(input.uid, authUpdates);
  if (authUpdates.password || authUpdates.disabled) {
    await auth.revokeRefreshTokens(input.uid);
  }

  await userRef.update(profileUpdates);

  if (target.studentId && (normalizedEmail || typeof input.disabled === "boolean")) {
    const stuUpdates: Record<string, unknown> = { updatedAt: now };
    if (normalizedEmail) stuUpdates.email = normalizedEmail;
    if (typeof input.disabled === "boolean") {
      stuUpdates.status = input.disabled ? "disabled" : "active";
    }
    await studentsCollection().doc(target.studentId).update(stuUpdates);
  }

  // Keep login_mappings synchronized so student/staff can immediately log in
  const mappingsSnap = await loginMappingsCollection()
    .where("uid", "==", input.uid)
    .get();
  if (!mappingsSnap.empty) {
    const batch = mappingsSnap.docs[0]!.ref.firestore.batch();
    for (const doc of mappingsSnap.docs) {
      const mUpdates: Record<string, unknown> = { updatedAt: now };
      if (normalizedEmail) mUpdates.authEmail = normalizedEmail;
      if (typeof input.disabled === "boolean") mUpdates.active = !input.disabled;
      batch.update(doc.ref, mUpdates);
    }
    await batch.commit();
  }

  await recordAuditLog({
    action: target.role === "student" ? "STUDENT_ACCESS_RESET" : "INSTITUTE_ACCESS_RESET",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId,
    targetId: input.uid,
    metadata: {
      role: target.role,
      updatedFields: updatedFields.join(","),
    },
  });

  return { uid: input.uid, updatedFields };
}
