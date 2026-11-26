import "server-only";
import type { CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection } from "@/lib/firebase/firestore";
import { hasStaffPermission } from "@/lib/security/permissions";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";

export interface CommunicationLogRecord {
  id: string;
  instituteId: string;
  channel: "whatsapp" | "sms" | "in_app";
  category: "fee_reminder" | "admission" | "examination" | "certificate" | "general";
  recipientCount: number;
  message: string;
  providerStatus: "logged_provider_unconfigured" | "queued" | "sent";
  sentByUid: string;
  createdAt: string;
}

export interface InstituteSettingsRecord {
  instituteId: string;
  studentIdPrefix: string;
  certificateSignatoryName: string;
  certificateSignatoryTitle: string;
  academicYear: string;
  notifyOnAdmission: boolean;
  notifyOnFeeDue: boolean;
  updatedAt: string;
  updatedByUid: string;
}

function commLogsCol() {
  return getAdminFirestore().collection(
    "communication_logs"
  ) as CollectionReference<CommunicationLogRecord>;
}

function instituteSettingsCol() {
  return getAdminFirestore().collection(
    "institute_settings"
  ) as CollectionReference<InstituteSettingsRecord>;
}

export async function listCommunicationLogs(
  actor: SessionUser
): Promise<CommunicationLogRecord[]> {
  if (!hasStaffPermission(actor, "communication:send")) {
    throw new AuthError(403, "FORBIDDEN", "Missing communication:send permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await commLogsCol()
    .where("instituteId", "==", institute.id)
    .get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
}

export async function dispatchInstituteNotification(
  actor: SessionUser,
  input: {
    channel: "whatsapp" | "sms" | "in_app";
    category: "fee_reminder" | "admission" | "examination" | "certificate" | "general";
    recipientCount: number;
    message: string;
  }
): Promise<CommunicationLogRecord> {
  if (!hasStaffPermission(actor, "communication:send")) {
    throw new AuthError(403, "FORBIDDEN", "Missing communication:send permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);

  // Provider abstraction: do NOT send external WhatsApp/SMS without configured provider
  if (input.channel === "whatsapp" || input.channel === "sms") {
    throw new AuthError(
      503,
      "PROVIDER_NOT_CONFIGURED",
      `${input.channel.toUpperCase()} provider is not configured. Use In-App Notification or configure a provider.`
    );
  }

  const id = generateId("MSG");
  const now = new Date().toISOString();
  const record: CommunicationLogRecord = {
    id,
    instituteId: institute.id,
    channel: input.channel,
    category: input.category,
    recipientCount: input.recipientCount,
    message: input.message,
    providerStatus: "sent",
    sentByUid: actor.uid,
    createdAt: now,
  };

  await commLogsCol().doc(id).set(record);
  return record;
}

export async function getInstituteSettings(actor: SessionUser) {
  const institute = await resolveAuthorizedInstitute(actor);
  const snap = await instituteSettingsCol().doc(institute.id).get();
  const settings = snap.data() ?? {
    instituteId: institute.id,
    studentIdPrefix: "STU",
    certificateSignatoryName: institute.ownerName,
    certificateSignatoryTitle: "Director",
    academicYear: `${new Date().getUTCFullYear()}-${new Date().getUTCFullYear() + 1}`,
    notifyOnAdmission: true,
    notifyOnFeeDue: true,
    updatedAt: institute.updatedAt,
    updatedByUid: institute.adminUid,
  };

  return { institute, settings };
}

export async function updateInstituteSettings(
  actor: SessionUser,
  input: {
    name: string;
    phone: string;
    address: string;
    studentIdPrefix: string;
    certificateSignatoryName: string;
    certificateSignatoryTitle: string;
    academicYear: string;
    notifyOnAdmission: boolean;
    notifyOnFeeDue: boolean;
  }
) {
  if (actor.role !== "institute_admin" && !hasStaffPermission(actor, "settings:write")) {
    throw new AuthError(403, "FORBIDDEN", "Missing settings:write permission.");
  }
  const institute = await resolveAuthorizedInstitute(actor);
  const now = new Date().toISOString();

  // Only non-sensitive institute-level fields can be updated here.
  // Pricing, walletBalancePaise, and status remain controlled strictly by Super Admin.
  await institutesCollection().doc(institute.id).update({
    name: input.name,
    phone: input.phone,
    address: input.address,
    updatedAt: now,
  });

  const settingsRecord: InstituteSettingsRecord = {
    instituteId: institute.id,
    studentIdPrefix: input.studentIdPrefix.toUpperCase(),
    certificateSignatoryName: input.certificateSignatoryName,
    certificateSignatoryTitle: input.certificateSignatoryTitle,
    academicYear: input.academicYear,
    notifyOnAdmission: input.notifyOnAdmission,
    notifyOnFeeDue: input.notifyOnFeeDue,
    updatedAt: now,
    updatedByUid: actor.uid,
  };

  await instituteSettingsCol().doc(institute.id).set(settingsRecord);

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    targetId: institute.id,
    metadata: { settingsUpdated: true },
  });

  return settingsRecord;
}
