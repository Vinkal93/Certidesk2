import "server-only";
import { auditLogsCollection } from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import type { UserRole } from "@/types/auth";
import type { AuditAction } from "@/types/domain";

export interface RecordAuditInput {
  action: AuditAction;
  actorUid: string;
  actorRole: UserRole | "system";
  instituteId?: string | null;
  targetId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function recordAuditLog(input: RecordAuditInput): Promise<void> {
  const id = generateId("AUD");
  await auditLogsCollection()
    .doc(id)
    .set({
      id,
      action: input.action,
      actorUid: input.actorUid,
      actorRole: input.actorRole,
      instituteId: input.instituteId ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    });
}
