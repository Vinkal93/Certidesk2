import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { assertServiceAllowed } from "@/services/emergency-policy.service";
import {
  issueCertificate,
  listInstituteCertificates,
  revokeCertificate,
} from "@/services/certificate.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const certActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("issue"),
    studentId: z.string().min(1),
    templateId: z.enum(["classic", "modern", "merit"]).default("classic"),
    grade: z.string().trim().min(1).max(20).default("A"),
  }),
  z.object({
    action: z.literal("revoke"),
    certificateId: z.string().min(1),
    reason: z.string().trim().min(3).max(200),
  }),
]);

export async function GET() {
  try {
    const actor = await requireSessionUser("institute");
    const certificates = await listInstituteCertificates(actor);
    return jsonOk({ certificates });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = certActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid certificate payload."
      );
    }

    if (parsed.data.action === "issue") {
      await assertServiceAllowed({
        serviceId: "certificates",
        instituteId: actor.instituteId,
        operation: "issue",
        isWrite: true,
        actorRole: actor.role,
      });
      const certificate = await issueCertificate(actor, parsed.data);
      return jsonOk({ certificate }, 201);
    }

    await assertServiceAllowed({
      serviceId: "certificates",
      instituteId: actor.instituteId,
      operation: "revoke",
      isWrite: true,
      actorRole: actor.role,
    });
    const certificate = await revokeCertificate(
      actor,
      parsed.data.certificateId,
      parsed.data.reason
    );
    return jsonOk({ certificate });
  } catch (error) {
    return handleApiError(error);
  }
}
