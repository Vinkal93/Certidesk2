import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import type { SessionUser } from "@/types/auth";
import { buildSbciNavyGoldTemplate } from "@/lib/pdf/certificate-presets";
import type {
  CertificateTemplateRecord,
  MarksheetTemplateRecord,
} from "@/types/templates";

function certTemplatesCol() {
  return getAdminFirestore().collection(
    "certificateTemplates"
  ) as CollectionReference<CertificateTemplateRecord>;
}

function marksheetTemplatesCol() {
  return getAdminFirestore().collection(
    "marksheetTemplates"
  ) as CollectionReference<MarksheetTemplateRecord>;
}

export function buildDefaultCertificateTemplate(
  actorUid = "system"
): CertificateTemplateRecord {
  return buildSbciNavyGoldTemplate(actorUid);
}

export function buildDefaultMarksheetTemplate(
  actorUid = "system"
): MarksheetTemplateRecord {
  const now = new Date().toISOString();
  return {
    id: "TPL_MKS_STANDARD_A4",
    name: "Standard Academic Marksheet A4",
    orientation: "portrait",
    headerTitle: "STATEMENT OF MARKS & ACADEMIC TRANSCRIPT",
    footerNote: "Electronically generated transcript verified via CertiDesk Pro QR code.",
    watermarkText: "OFFICIAL TRANSCRIPT",
    columns: [
      { key: "subjectName", label: "Subject", widthPercent: 40, align: "left" },
      { key: "maxMarks", label: "Max", widthPercent: 15, align: "center" },
      { key: "passingMarks", label: "Pass", widthPercent: 15, align: "center" },
      { key: "obtainedMarks", label: "Obtained", widthPercent: 15, align: "center" },
      { key: "status", label: "Result", widthPercent: 15, align: "center" },
    ],
    status: "published",
    version: 1,
    updatedBy: actorUid,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listCertificateTemplates(): Promise<CertificateTemplateRecord[]> {
  const snap = await certTemplatesCol().get();
  if (snap.empty) {
    return [buildDefaultCertificateTemplate()];
  }
  return snap.docs.map((d) => d.data());
}

export async function getCertificateTemplateById(
  templateId: string
): Promise<CertificateTemplateRecord> {
  const snap = await certTemplatesCol().doc(templateId).get();
  if (snap.exists && snap.data()) {
    return snap.data()!;
  }
  if (
    templateId === "TPL_CERT_CLASSIC_A4" ||
    templateId === "TPL_CERT_SBCI_NAVY_GOLD" ||
    templateId === "classic" ||
    templateId === "modern" ||
    templateId === "merit"
  ) {
    return buildDefaultCertificateTemplate();
  }
  throw new AuthError(404, "TEMPLATE_NOT_FOUND", "Certificate template not found.");
}

export async function saveCertificateTemplate(
  actor: SessionUser,
  input: Partial<CertificateTemplateRecord> & { name: string }
): Promise<CertificateTemplateRecord> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
  const now = new Date().toISOString();
  const id = input.id || generateId("TPL_CERT");
  const existingSnap = await certTemplatesCol().doc(id).get();
  const existing = existingSnap.data();

  const record: CertificateTemplateRecord = {
    ...buildDefaultCertificateTemplate(actor.uid),
    ...(existing ?? {}),
    ...input,
    id,
    version: (existing?.version ?? 0) + 1,
    updatedBy: actor.uid,
    updatedAt: now,
  };

  await certTemplatesCol().doc(id).set(record);
  return record;
}

export async function listMarksheetTemplates(): Promise<MarksheetTemplateRecord[]> {
  const snap = await marksheetTemplatesCol().get();
  if (snap.empty) {
    return [buildDefaultMarksheetTemplate()];
  }
  return snap.docs.map((d) => d.data());
}

export async function getMarksheetTemplateById(
  templateId: string
): Promise<MarksheetTemplateRecord> {
  const snap = await marksheetTemplatesCol().doc(templateId).get();
  if (snap.exists && snap.data()) {
    return snap.data()!;
  }
  if (templateId === "TPL_MKS_STANDARD_A4") {
    return buildDefaultMarksheetTemplate();
  }
  throw new AuthError(404, "TEMPLATE_NOT_FOUND", "Marksheet template not found.");
}

export async function saveMarksheetTemplate(
  actor: SessionUser,
  input: Partial<MarksheetTemplateRecord> & { name: string }
): Promise<MarksheetTemplateRecord> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
  const now = new Date().toISOString();
  const id = input.id || generateId("TPL_MKS");
  const existingSnap = await marksheetTemplatesCol().doc(id).get();
  const existing = existingSnap.data();

  const record: MarksheetTemplateRecord = {
    ...buildDefaultMarksheetTemplate(actor.uid),
    ...(existing ?? {}),
    ...input,
    id,
    version: (existing?.version ?? 0) + 1,
    updatedBy: actor.uid,
    updatedAt: now,
  };

  await marksheetTemplatesCol().doc(id).set(record);
  return record;
}
