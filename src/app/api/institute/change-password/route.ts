import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import { usersCollection } from "@/lib/firebase/firestore";
import { AuthError, requireSessionUser } from "@/lib/security/session";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { recordAuditLog } from "@/services/audit.service";

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters.").max(100),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser("institute");
    if (user.role === "super_admin") {
      throw new AuthError(
        403,
        "IMPRESSION_READ_ONLY",
        "Use Super Admin institute settings to reset institute owner password."
      );
    }

    const body = ChangePasswordSchema.parse(await req.json());
    const auth = getAdminAuth();
    const now = new Date().toISOString();

    await auth.updateUser(user.uid, {
      password: body.newPassword,
    });
    await auth.setCustomUserClaims(user.uid, {
      role: user.role,
      instituteId: user.instituteId,
      studentId: user.studentId,
      permissions: user.permissions,
      mustChangePassword: false,
    });

    await usersCollection().doc(user.uid).update({
      mustChangePassword: false,
      updatedAt: now,
    });

    await recordAuditLog({
      action: "PASSWORD_CHANGED",
      actorUid: user.uid,
      actorRole: user.role,
      instituteId: user.instituteId,
      targetId: user.uid,
      metadata: { portal: "institute" },
    });

    return jsonOk({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
