import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { studentsCollection, usersCollection } from "@/lib/firebase/firestore";
import { requireSessionUser, revokeSessionAndClearCookie } from "@/lib/security/session";
import { recordAuditLog } from "@/services/audit.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(100),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("student");
    if (!actor.studentId || !actor.instituteId) {
      return jsonError(403, "STUDENT_UNASSIGNED", "Student profile link missing.");
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid password."
      );
    }

    const auth = getAdminAuth();
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    await auth.updateUser(actor.uid, { password: parsed.data.newPassword });
    await auth.setCustomUserClaims(actor.uid, {
      role: "student",
      instituteId: actor.instituteId,
      studentId: actor.studentId,
      permissions: [],
      mustChangePassword: false,
    });

    const batch = db.batch();
    batch.update(studentsCollection().doc(actor.studentId), {
      mustChangePassword: false,
      updatedAt: now,
    });
    batch.update(usersCollection().doc(actor.uid), {
      mustChangePassword: false,
      updatedAt: now,
    });
    await batch.commit();

    await recordAuditLog({
      action: "PASSWORD_CHANGED",
      actorUid: actor.uid,
      actorRole: "student",
      instituteId: actor.instituteId,
      targetId: actor.studentId,
    });

    // Revoke existing sessions so the student signs back in cleanly with the new password
    await revokeSessionAndClearCookie(actor.uid);

    return jsonOk({ passwordUpdated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
