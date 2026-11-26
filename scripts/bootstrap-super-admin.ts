/**
 * One-time CLI script to provision the initial Super Admin account
 * using Firebase Admin SDK.
 *
 * Usage:
 *   SUPER_ADMIN_EMAIL="admin@certidesk.app" SUPER_ADMIN_PASSWORD="StrongPassword123!" npx tsx scripts/bootstrap-super-admin.ts
 *
 * This script is CLI-only and MUST NEVER be exposed via an HTTP endpoint.
 */
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID || "certidesk2-deb79";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const adminName = process.env.SUPER_ADMIN_NAME?.trim() || "Platform Super Admin";

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY environment variables."
    );
  }
  if (!adminEmail || !adminPassword || adminPassword.length < 10) {
    throw new Error("Provide SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (min 10 chars).");
  }

  const app =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        });

  const auth = getAuth(app);
  const db = getFirestore(app);

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(adminEmail);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: adminPassword,
      displayName: adminName,
      disabled: false,
    });
    console.log(`Updated existing Super Admin Auth user: ${uid}`);
  } catch {
    const created = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
      emailVerified: true,
      disabled: false,
    });
    uid = created.uid;
    console.log(`Created new Super Admin Auth user: ${uid}`);
  }

  await auth.setCustomUserClaims(uid, {
    role: "super_admin",
    instituteId: null,
    studentId: null,
    mustChangePassword: false,
  });

  const now = new Date().toISOString();
  await db.collection("users").doc(uid).set(
    {
      uid,
      email: adminEmail,
      displayName: adminName,
      role: "super_admin",
      instituteId: null,
      studentId: null,
      permissions: [],
      disabled: false,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await db.collection("audit_logs").add({
    action: "SUPER_ADMIN_BOOTSTRAPPED",
    actorUid: uid,
    actorRole: "system",
    instituteId: null,
    targetId: uid,
    metadata: { email: adminEmail },
    createdAt: now,
  });

  console.log("Super Admin provisioned successfully with role=super_admin.");
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
