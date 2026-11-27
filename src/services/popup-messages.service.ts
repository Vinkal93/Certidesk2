import "server-only";
import { FieldValue, type CollectionReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection, studentsCollection } from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";

export type PopupMessageCategory =
  "announcement" | "fee_reminder" | "exam_notice" | "billing_alert" | "urgent";

export type PopupTargetType = "institute" | "all_institutes" | "student" | "all_students";

export interface PopupMessageRecord {
  id: string;
  senderRole: "super_admin" | "institute_admin";
  senderUid: string;
  senderName: string;
  targetType: PopupTargetType;
  instituteId: string | null;
  targetStudentId: string | null;
  targetLabel: string;
  category: PopupMessageCategory;
  title: string;
  message: string;
  ctaLabel?: string | undefined;
  ctaHref?: string | undefined;
  readByUids: string[];
  createdAt: string;
}

export interface RecipientPopupMessage extends PopupMessageRecord {
  isRead: boolean;
}

function popupMessagesCol() {
  return getAdminFirestore().collection(
    "popupMessages"
  ) as CollectionReference<PopupMessageRecord>;
}

export async function sendSuperAdminPopupMessage(
  actor: SessionUser,
  input: {
    targetType: "institute" | "all_institutes";
    instituteId?: string | undefined;
    category: PopupMessageCategory;
    title: string;
    message: string;
    ctaLabel?: string | undefined;
    ctaHref?: string | undefined;
  }
): Promise<PopupMessageRecord> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }

  let targetLabel = "All Institutes";
  let resolvedInstituteId: string | null = null;
  if (input.targetType === "institute") {
    if (!input.instituteId) {
      throw new AuthError(400, "INSTITUTE_REQUIRED", "Select a target institute.");
    }
    const instDoc = await institutesCollection().doc(input.instituteId).get();
    if (!instDoc.exists) {
      throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Target institute not found.");
    }
    resolvedInstituteId = instDoc.id;
    targetLabel = `${instDoc.data()!.name} (${instDoc.data()!.code})`;
  }

  const id = generateId("pop");
  const now = new Date().toISOString();
  const record: PopupMessageRecord = {
    id,
    senderRole: "super_admin",
    senderUid: actor.uid,
    senderName: actor.email ?? "CertiDesk Super Admin",
    targetType: input.targetType,
    instituteId: resolvedInstituteId,
    targetStudentId: null,
    targetLabel,
    category: input.category,
    title: input.title.trim(),
    message: input.message.trim(),
    ...(input.ctaLabel?.trim() ? { ctaLabel: input.ctaLabel.trim() } : {}),
    ...(input.ctaHref?.trim() ? { ctaHref: input.ctaHref.trim() } : {}),
    readByUids: [],
    createdAt: now,
  };

  await popupMessagesCol().doc(id).set(record);

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: resolvedInstituteId,
    targetId: id,
    metadata: {
      event: "POPUP_MESSAGE_SENT",
      targetType: input.targetType,
      category: input.category,
      title: record.title,
    },
  });

  return record;
}

export async function sendInstitutePopupMessage(
  actor: SessionUser,
  input: {
    targetType: "student" | "all_students";
    studentId?: string | undefined;
    category: PopupMessageCategory;
    title: string;
    message: string;
    ctaLabel?: string | undefined;
    ctaHref?: string | undefined;
  }
): Promise<PopupMessageRecord> {
  if (actor.role !== "institute_admin" && actor.role !== "staff") {
    throw new AuthError(403, "FORBIDDEN", "Institute authorization required.");
  }
  if (!actor.instituteId) {
    throw new AuthError(400, "INSTITUTE_MISSING", "Institute context missing.");
  }

  let targetLabel = "All Institute Students";
  let targetStudentId: string | null = null;

  if (input.targetType === "student") {
    if (!input.studentId) {
      throw new AuthError(400, "STUDENT_REQUIRED", "Select a target student.");
    }
    const stuDoc = await studentsCollection().doc(input.studentId).get();
    if (!stuDoc.exists || stuDoc.data()!.instituteId !== actor.instituteId) {
      throw new AuthError(
        404,
        "STUDENT_NOT_FOUND",
        "Target student not found in your institute."
      );
    }
    targetStudentId = stuDoc.id;
    targetLabel = `${stuDoc.data()!.fullName} (${stuDoc.data()!.studentCode})`;
  }

  const instDoc = await institutesCollection().doc(actor.instituteId).get();
  const senderName = instDoc.exists ? instDoc.data()!.name : "Institute Admin";

  const id = generateId("pop");
  const now = new Date().toISOString();
  const record: PopupMessageRecord = {
    id,
    senderRole: "institute_admin",
    senderUid: actor.uid,
    senderName,
    targetType: input.targetType,
    instituteId: actor.instituteId,
    targetStudentId,
    targetLabel,
    category: input.category,
    title: input.title.trim(),
    message: input.message.trim(),
    ...(input.ctaLabel?.trim() ? { ctaLabel: input.ctaLabel.trim() } : {}),
    ...(input.ctaHref?.trim() ? { ctaHref: input.ctaHref.trim() } : {}),
    readByUids: [],
    createdAt: now,
  };

  await popupMessagesCol().doc(id).set(record);

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: actor.instituteId,
    targetId: id,
    metadata: {
      event: "STUDENT_POPUP_MESSAGE_SENT",
      targetType: input.targetType,
      targetStudentId,
      category: input.category,
      title: record.title,
    },
  });

  return record;
}

export async function listPopupMessagesForRecipient(
  user: SessionUser
): Promise<RecipientPopupMessage[]> {
  const col = popupMessagesCol();

  if (user.role === "institute_admin" || user.role === "staff") {
    const [allInstSnap, specificInstSnap] = await Promise.all([
      col.where("targetType", "==", "all_institutes").get(),
      user.instituteId
        ? col.where("instituteId", "==", user.instituteId).get()
        : Promise.resolve(null),
    ]);

    const merged = new Map<string, PopupMessageRecord>();
    for (const d of allInstSnap.docs) merged.set(d.id, d.data());
    if (specificInstSnap) {
      for (const d of specificInstSnap.docs) {
        const msg = d.data();
        if (msg.targetType === "institute") {
          merged.set(d.id, msg);
        }
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30)
      .map((m) => ({
        ...m,
        isRead: Array.isArray(m.readByUids) && m.readByUids.includes(user.uid),
      }));
  }

  if (user.role === "student" && user.instituteId) {
    const snap = await col.where("instituteId", "==", user.instituteId).get();
    return snap.docs
      .map((d) => d.data())
      .filter(
        (m) =>
          m.targetType === "all_students" ||
          (m.targetType === "student" && m.targetStudentId === user.studentId)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30)
      .map((m) => ({
        ...m,
        isRead: Array.isArray(m.readByUids) && m.readByUids.includes(user.uid),
      }));
  }

  return [];
}

export async function markPopupMessageRead(
  user: SessionUser,
  messageIds: string[]
): Promise<{ marked: number }> {
  if (messageIds.length === 0) return { marked: 0 };
  const batch = getAdminFirestore().batch();
  for (const id of messageIds.slice(0, 25)) {
    batch.update(popupMessagesCol().doc(id), {
      readByUids: FieldValue.arrayUnion(user.uid),
    });
  }
  await batch.commit();
  return { marked: Math.min(messageIds.length, 25) };
}

export async function listSentPopupMessages(
  actor: SessionUser
): Promise<PopupMessageRecord[]> {
  if (actor.role === "super_admin") {
    const snap = await popupMessagesCol().where("senderRole", "==", "super_admin").get();
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 40);
  }
  if ((actor.role === "institute_admin" || actor.role === "staff") && actor.instituteId) {
    const snap = await popupMessagesCol()
      .where("instituteId", "==", actor.instituteId)
      .get();
    return snap.docs
      .map((d) => d.data())
      .filter((m) => m.senderRole === "institute_admin")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 40);
  }
  return [];
}
