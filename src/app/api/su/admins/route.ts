import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import { usersCollection } from "@/lib/firebase/firestore";
import { AuthError, requireSessionUser } from "@/lib/security/session";
import { handleApiError, jsonOk } from "@/lib/utils/api-response";
import { recordAuditLog } from "@/services/audit.service";

const CreateSuperAdminSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(6, "Password must be at least 6 characters.").max(100),
});

export async function GET() {
  try {
    await requireSessionUser("super_admin");
    const snap = await usersCollection().where("role", "==", "super_admin").get();
    const admins = snap.docs
      .map((d) => {
        const u = d.data();
        return {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email,
          disabled: Boolean(u.disabled),
          createdAt: u.createdAt,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return jsonOk({ admins });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body = CreateSuperAdminSchema.parse(await req.json());
    const emailLower = body.email.toLowerCase();
    const auth = getAdminAuth();

    const existing = await usersCollection().where("email", "==", emailLower).get();
    if (!existing.empty) {
      throw new AuthError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "An account with this email address already exists."
      );
    }

    const created = await auth.createUser({
      email: emailLower,
      password: body.password,
      displayName: body.displayName,
      disabled: false,
    });

    await auth.setCustomUserClaims(created.uid, {
      role: "super_admin",
      instituteId: null,
      studentId: null,
      permissions: [],
      mustChangePassword: false,
    });

    const now = new Date().toISOString();
    await usersCollection().doc(created.uid).set({
      uid: created.uid,
      email: emailLower,
      displayName: body.displayName,
      role: "super_admin",
      instituteId: null,
      studentId: null,
      permissions: [],
      disabled: false,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    });

    await recordAuditLog({
      action: "INSTITUTE_UPDATED",
      actorUid: actor.uid,
      actorRole: actor.role,
      instituteId: null,
      targetId: created.uid,
      metadata: {
        event: "SUPER_ADMIN_CREATED",
        email: emailLower,
      },
    });

    return jsonOk(
      {
        admin: {
          uid: created.uid,
          email: emailLower,
          displayName: body.displayName,
          disabled: false,
          createdAt: now,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
