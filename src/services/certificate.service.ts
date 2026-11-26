import "server-only";
import { randomBytes } from "crypto";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection, studentsCollection } from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import { applyWalletDebitInTransaction } from "./wallet.service";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";
import type { CertificateRecord } from "@/types/academic";

function certificatesCol() {
  return getAdminFirestore().collection(
    "certificates"
  ) as CollectionReference<CertificateRecord>;
}

export async function listInstituteCertificates(
  actor: SessionUser
): Promise<CertificateRecord[]> {
  if (!hasStaffPermission(actor, "certificates:read")) {
    throw new AuthError(403, "FORBIDDEN", "Missing certificates:read permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await certificatesCol().where("instituteId", "==", institute.id).get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .slice(0, 200);
}

export async function issueCertificate(
  actor: SessionUser,
  input: {
    studentId: string;
    templateId: "classic" | "modern" | "merit";
    grade: string;
  }
): Promise<CertificateRecord> {
  if (!hasStaffPermission(actor, "certificates:issue")) {
    throw new AuthError(403, "FORBIDDEN", "Missing certificates:issue permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const db = getAdminFirestore();

  const studentSnap = await studentsCollection().doc(input.studentId).get();
  const student = studentSnap.data();
  if (!studentSnap.exists || !student || student.instituteId !== institute.id) {
    throw new AuthError(404, "STUDENT_NOT_FOUND", "Student not found.");
  }

  const certId = generateId("CRT");
  const year = new Date().getUTCFullYear();
  const serial = randomBytes(3).toString("hex").toUpperCase();
  const certificateNumber = `CERT-${year}-${serial}`;
  const verificationId = `VER-${randomBytes(4).toString("hex").toUpperCase()}`;
  const now = new Date().toISOString();

  const record: CertificateRecord = {
    id: certId,
    certificateNumber,
    verificationId,
    instituteId: institute.id,
    instituteName: institute.name,
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.fullName,
    courseName: student.courseName,
    templateId: input.templateId,
    grade: input.grade,
    status: "issued",
    revokeReason: null,
    issuedByUid: actor.uid,
    issuedAt: now,
    updatedAt: now,
  };

  await db.runTransaction(async (tx) => {
    const instRef = institutesCollection().doc(institute.id);
    const instSnap = await tx.get(instRef);
    const latestInst = instSnap.data();
    if (!instSnap.exists || !latestInst || latestInst.status !== "active") {
      throw new AuthError(423, "INSTITUTE_SUSPENDED", "Institute is not active.");
    }

    const certFeePaise = latestInst.pricing.certificateFeePaise;
    if (certFeePaise > 0) {
      applyWalletDebitInTransaction(tx, latestInst.walletBalancePaise, {
        instituteId: institute.id,
        amountPaise: certFeePaise,
        reason: "manual_adjustment",
        referenceId: certId,
        actorUid: actor.uid,
        note: `Certificate issuance fee (${certificateNumber})`,
      });
    }

    tx.set(certificatesCol().doc(certId), record);
  });

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: certId,
    metadata: { certificateNumber, verificationId, templateId: input.templateId },
  });

  return record;
}

export async function revokeCertificate(
  actor: SessionUser,
  certificateId: string,
  reason: string
): Promise<CertificateRecord> {
  if (!hasStaffPermission(actor, "certificates:issue")) {
    throw new AuthError(403, "FORBIDDEN", "Missing certificates:issue permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const ref = certificatesCol().doc(certificateId);
  const snap = await ref.get();
  const existing = snap.data();

  if (!snap.exists || !existing || existing.instituteId !== institute.id) {
    throw new AuthError(404, "CERTIFICATE_NOT_FOUND", "Certificate not found.");
  }

  const now = new Date().toISOString();
  const updated: CertificateRecord = {
    ...existing,
    status: "revoked",
    revokeReason: reason,
    updatedAt: now,
  };

  await ref.set(updated);

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: certificateId,
    metadata: { revoked: true, reason },
  });

  return updated;
}

export async function getCertificateByVerificationId(
  verificationId: string
): Promise<CertificateRecord | null> {
  const snap = await certificatesCol()
    .where("verificationId", "==", verificationId.trim().toUpperCase())
    .limit(1)
    .get();
  return snap.docs[0]?.data() ?? null;
}

export async function listStudentOwnCertificates(
  studentId: string,
  instituteId: string
): Promise<CertificateRecord[]> {
  const snap = await certificatesCol().where("studentId", "==", studentId).get();
  return snap.docs
    .map((d) => d.data())
    .filter((c) => c.instituteId === instituteId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}
