import { NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import { getServerEnv } from "@/config/env.server";
import { renderCertificatePdfBuffer } from "@/lib/pdf/renderer";
import { validateCertificateBeforeExport } from "@/lib/pdf/certificate-validation";
import { buildCertificateDownloadFilename } from "@/lib/pdf/certificate-placeholders";
import { handleApiError, jsonError } from "@/lib/utils/api-response";
import type { CertificateTemplateRecord } from "@/types/templates";
import type { CertificatePlaceholderValues } from "@/lib/pdf/certificate-placeholders";

export async function POST(request: NextRequest) {
  try {
    await requireSessionUser("super_admin");
    const body = (await request.json().catch(() => null)) as {
      template?: CertificateTemplateRecord;
      placeholders?: CertificatePlaceholderValues;
    } | null;

    if (!body?.template) {
      return jsonError(400, "TEMPLATE_REQUIRED", "Template payload is required.");
    }

    const baseUrl = getServerEnv().APP_BASE_URL.replace(/\/+$/, "");
    const verifyUrl = `${baseUrl}/verify/CERT_PREVIEW_SAMPLE`;
    const placeholders: CertificatePlaceholderValues = body.placeholders ?? {
      institute_name: "SBCI COMPUTER INSTITUTE",
      institute_address:
        "Bhuvalpur Road, Main Chauraha, Akbarpur, Ambedkar Nagar - 224122 (U.P.)",
      registration_number: "SBCI/2026/001",
      issue_date: "28 Nov 2026",
      student_name: "Rahul Kumar",
      student_id: "STU-SBCI-001",
      course_name: "ADCA",
      course_full_name: "Advanced Diploma in Computer Applications",
      duration: "12 Months",
      marks: "425 / 500",
      percentage: "85",
      grade: "A+",
      result: "PASS",
      certificate_number: "CERT-SBCI-2026-0001",
      director_name: "Vinkal Prajapati",
    };

    const validation = validateCertificateBeforeExport({
      template: body.template,
      placeholders,
      verifyUrl,
    });
    if (!validation.valid) {
      return jsonError(400, "CERTIFICATE_VALIDATION_FAILED", validation.errors.join(" "));
    }

    const pdfBytes = await renderCertificatePdfBuffer({
      template: body.template,
      placeholders,
      verifyUrl,
    });

    const filename = buildCertificateDownloadFilename({
      instituteName: placeholders.institute_name || "SBCI",
      courseName: placeholders.course_name || "ADCA",
      studentName: placeholders.student_name || "Sample",
    });

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
