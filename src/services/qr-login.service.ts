import "server-only";
import crypto from "crypto";
import QRCode from "qrcode";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SessionUser, UserRole } from "@/types/auth";

export type QrSessionStatus = "waiting" | "scanned" | "confirmed" | "expired";

export interface QrLoginSessionRecord {
  id: string;
  secretHash: string;
  status: QrSessionStatus;
  uid: string | null;
  email: string | null;
  role: UserRole | null;
  instituteId: string | null;
  studentId: string | null;
  deviceName: string | null;
  consumed: boolean;
  expiresAt: string;
  createdAt: string;
  confirmedAt: string | null;
}

function qrSessionsCol() {
  return getAdminFirestore().collection(
    "qrLoginSessions"
  ) as CollectionReference<QrLoginSessionRecord>;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildQrModules(payload: string): boolean[][] {
  const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const matrix: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      row.push(Boolean(data[y * size + x]));
    }
    matrix.push(row);
  }
  return matrix;
}

export async function createQrLoginSession(origin: string): Promise<{
  codeId: string;
  qrModules: boolean[][];
  expiresInSeconds: number;
}> {
  const codeId = generateId("QRL");
  const token = crypto.randomBytes(24).toString("hex");
  const now = new Date();
  const expiresInSeconds = 60;
  const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000).toISOString();

  const payloadUrl = `${origin.replace(/\/$/, "")}/scan-login?codeId=${encodeURIComponent(
    codeId
  )}&token=${encodeURIComponent(token)}`;

  const record: QrLoginSessionRecord = {
    id: codeId,
    secretHash: hashToken(token),
    status: "waiting",
    uid: null,
    email: null,
    role: null,
    instituteId: null,
    studentId: null,
    deviceName: null,
    consumed: false,
    expiresAt,
    createdAt: now.toISOString(),
    confirmedAt: null,
  };

  await qrSessionsCol().doc(codeId).set(record);

  return {
    codeId,
    qrModules: buildQrModules(payloadUrl),
    expiresInSeconds,
  };
}

export async function pollQrLoginSession(codeId: string): Promise<{
  status: QrSessionStatus;
  deviceName?: string;
  welcomeMessage?: string;
  customToken?: string;
  role?: UserRole;
}> {
  const ref = qrSessionsCol().doc(codeId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { status: "expired" };
  }

  const doc = snap.data()!;
  const isTimedOut = new Date(doc.expiresAt).getTime() <= Date.now();
  if (doc.status !== "confirmed" && (doc.status === "expired" || isTimedOut)) {
    if (doc.status !== "expired") {
      await ref.update({ status: "expired" }).catch(() => undefined);
    }
    return { status: "expired" };
  }

  if (doc.status === "scanned") {
    return {
      status: "scanned",
      ...(doc.deviceName ? { deviceName: doc.deviceName } : {}),
    };
  }

  if (doc.status === "confirmed" && doc.uid && doc.role) {
    if (doc.consumed) {
      return { status: "expired" };
    }
    await ref.update({ consumed: true });
    const customToken = await getAdminAuth().createCustomToken(doc.uid, {
      qrSessionId: doc.id,
    });
    return {
      status: "confirmed",
      ...(doc.deviceName ? { deviceName: doc.deviceName } : {}),
      welcomeMessage: doc.email ? `Welcome back, ${doc.email}` : "Welcome back",
      customToken,
      role: doc.role,
    };
  }

  return { status: "waiting" };
}

export async function scanOrConfirmQrSession(
  actor: SessionUser,
  input: {
    action: "scan" | "confirm";
    codeId: string;
    token: string;
    deviceName?: string | undefined;
  }
): Promise<{ status: QrSessionStatus }> {
  const ref = qrSessionsCol().doc(input.codeId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AuthError(404, "QR_SESSION_NOT_FOUND", "QR session not found or expired.");
  }

  const doc = snap.data()!;
  if (doc.consumed || doc.status === "expired") {
    throw new AuthError(410, "QR_SESSION_EXPIRED", "This QR code has expired.");
  }
  if (new Date(doc.expiresAt).getTime() <= Date.now()) {
    await ref.update({ status: "expired" }).catch(() => undefined);
    throw new AuthError(410, "QR_SESSION_EXPIRED", "This QR code has expired.");
  }

  if (hashToken(input.token) !== doc.secretHash) {
    throw new AuthError(403, "QR_TOKEN_INVALID", "Invalid QR verification token.");
  }

  const deviceLabel = input.deviceName?.trim() || "Mobile Device";

  if (input.action === "scan") {
    await ref.update({
      status: "scanned",
      uid: actor.uid,
      email: actor.email,
      role: actor.role,
      deviceName: deviceLabel,
    });
    return { status: "scanned" };
  }

  await ref.update({
    status: "confirmed",
    uid: actor.uid,
    email: actor.email,
    role: actor.role,
    instituteId: actor.instituteId,
    studentId: actor.studentId,
    deviceName: deviceLabel,
    confirmedAt: new Date().toISOString(),
  });

  await recordAuditLog({
    action: "AUTH_LOGIN_SUCCESS",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: actor.instituteId,
    targetId: doc.id,
    metadata: {
      method: "qr_login_confirmed",
      deviceName: deviceLabel,
    },
  });

  return { status: "confirmed" };
}
