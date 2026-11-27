import "server-only";
import { auditLogsCollection } from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import type { UserRole } from "@/types/auth";
import type { AuditAction } from "@/types/domain";

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|cookie|otp|privatekey|authorization|keysecret|webhooksecret|session/i;

export function redactSensitiveMetadata(
  metadata: Record<string, string | number | boolean | null> | undefined
): Record<string, string | number | boolean | null> {
  if (!metadata) return {};
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, val] of Object.entries(metadata)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      clean[key] = "[REDACTED]";
    } else if (typeof val === "string" && val.length > 500) {
      clean[key] = `${val.slice(0, 500)}…`;
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export interface RecordAuditInput {
  action: AuditAction;
  actorUid: string;
  actorRole: UserRole | "system";
  instituteId?: string | null;
  targetId?: string | null;
  resourceType?: string | null;
  result?: "success" | "failure";
  reason?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function recordAuditLog(input: RecordAuditInput): Promise<string> {
  const id = generateId("AUD");
  const safeMeta = redactSensitiveMetadata({
    ...(input.metadata ?? {}),
    ...(input.resourceType ? { resourceType: input.resourceType } : {}),
    ...(input.result ? { result: input.result } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
  });

  await auditLogsCollection()
    .doc(id)
    .set({
      id,
      action: input.action,
      actorUid: input.actorUid,
      actorRole: input.actorRole,
      instituteId: input.instituteId ?? null,
      targetId: input.targetId ?? null,
      metadata: safeMeta,
      createdAt: new Date().toISOString(),
    });

  return id;
}
