import { NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getServerEnv } from "@/config/env.server";
import { requireSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { getCertificateTemplateById } from "@/services/template-studio.service";
import { renderCertificatePdfBuffer } from "@/lib/pdf/renderer";
import { handleApiError, jsonError } from "@/lib/utils/api-response";
import type { CertificateRecord } from "@/types/academic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { id } = await context.params;
    const snap = await getAdminFirestore().collection("certificates").doc(id).get();
    const cert = snap.data() as CertificateRecord | undefined;

    if (!snap.exists || !cert) {
      return jsonError(404, "CERTIFICATE_NOT_FOUND", "Certificate not found.");
    }

    if (actor.role === "student") {
      if (cert.studentId !== actor.studentId || cert.instituteId !== actor.instituteId) {
        return jsonError(403, "FORBIDDEN", "Access denied.");
      }
    } else if (actor.role !== "super_admin") {
      const institute = await resolveAuthorizedInstitute(actor);
      if (cert.instituteId !== institute.id) {
        return jsonError(403, "FORBIDDEN", "Cross-institute access denied.");
      }
    }

    const template = await getCertificateTemplateById("TPL_CERT_CLASSIC_A4");
    const baseUrl = getServerEnv().APP_BASE_URL.replace(/\/+$/, "");
    const pdfBytes = await renderCertificatePdfBuffer({
      template,
      placeholders: {
        student_name: cert.studentName,
        student_id: cert.studentCode,
        course_name: cert.courseName,
        institute_name: cert.instituteName,
        certificate_number: cert.certificateNumber,
        issue_date: cert.issuedAt.slice(0, 10),
        grade: cert.grade,
        result: cert.status === "issued" ? "VERIFIED" : "REVOKED",
      },
      verifyUrl: `${baseUrl}/verify/${cert.verificationId}`,
    });

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${cert.certificateNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
