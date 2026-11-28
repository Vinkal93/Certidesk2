import { NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { institutesCollection, studentsCollection } from "@/lib/firebase/firestore";
import { getServerEnv } from "@/config/env.server";
import { requireSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { getCertificateTemplateById } from "@/services/template-studio.service";
import {
  renderBulkCertificatesPdfBuffer,
  renderCertificatePdfBuffer,
} from "@/lib/pdf/renderer";
import {
  buildCertificateDownloadFilename,
  type CertificatePlaceholderValues,
} from "@/lib/pdf/certificate-placeholders";
import { validateCertificateBeforeExport } from "@/lib/pdf/certificate-validation";
import { handleApiError, jsonError } from "@/lib/utils/api-response";
import type { CertificateRecord, CourseRecord } from "@/types/academic";

async function buildPlaceholdersForCert(
  cert: CertificateRecord,
  db: FirebaseFirestore.Firestore
): Promise<CertificatePlaceholderValues> {
  const [instSnap, stuSnap, coursesSnap] = await Promise.all([
    institutesCollection().doc(cert.instituteId).get(),
    studentsCollection().doc(cert.studentId).get(),
    db.collection("courses").where("instituteId", "==", cert.instituteId).get(),
  ]);

  const institute = instSnap.data();
  const student = stuSnap.data();
  const courses = coursesSnap.docs.map((d) => d.data() as CourseRecord);
  const matchedCourse = courses.find(
    (c) =>
      c.id === student?.courseId ||
      c.name.toLowerCase() === cert.courseName.toLowerCase() ||
      c.code.toLowerCase() === cert.courseName.toLowerCase()
  );

  const issueFormatted = new Date(cert.issuedAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const extInst = institute as
    | (typeof institute & {
        address?: string;
        city?: string;
        state?: string;
        logoUrl?: string;
        directorName?: string;
        directorSignatureUrl?: string;
        authorizedSignatoryUrl?: string;
        sealUrl?: string;
        registrationNumber?: string;
      })
    | undefined;

  const addressParts = [extInst?.address, extInst?.city, extInst?.state].filter(Boolean);

  return {
    institute_name: institute?.name ?? cert.instituteName,
    institute_logo: extInst?.logoUrl ?? "",
    institute_address:
      addressParts.join(", ") || `${institute?.code ?? cert.instituteId}`,
    registration_number:
      extInst?.registrationNumber ?? institute?.code ?? cert.certificateNumber,
    issue_date: issueFormatted,
    student_name: cert.studentName,
    student_id: cert.studentCode,
    course_name: matchedCourse?.code || cert.courseName,
    course_full_name: matchedCourse?.name || cert.courseName,
    duration: matchedCourse?.duration || "",
    marks: "",
    percentage: cert.grade === "A+" ? "85" : cert.grade === "A" ? "75" : "65",
    grade: cert.grade || "A",
    result: cert.status === "issued" ? "PASS" : "REVOKED",
    certificate_number: cert.certificateNumber,
    director_name: extInst?.directorName || "Director",
    director_signature: extInst?.directorSignatureUrl ?? "",
    authorized_signatory: extInst?.authorizedSignatoryUrl ?? "",
    institute_seal: extInst?.sealUrl ?? "",
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { id } = await context.params;
    const db = getAdminFirestore();
    const bulkIdsParam = request.nextUrl.searchParams.get("bulkIds");
    const baseUrl = getServerEnv().APP_BASE_URL.replace(/\/+$/, "");

    if (bulkIdsParam && actor.role !== "student") {
      const ids = bulkIdsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50);
      const institute =
        actor.role === "super_admin" ? null : await resolveAuthorizedInstitute(actor);

      const items = [];
      for (const certId of ids) {
        const snap = await db.collection("certificates").doc(certId).get();
        const cert = snap.data() as CertificateRecord | undefined;
        if (!snap.exists || !cert) continue;
        if (institute && cert.instituteId !== institute.id) continue;
        const template = await getCertificateTemplateById(
          cert.templateId || "TPL_CERT_SBCI_NAVY_GOLD"
        );
        const placeholders = await buildPlaceholdersForCert(cert, db);
        items.push({
          template,
          placeholders,
          verifyUrl: `${baseUrl}/verify/${cert.verificationId}`,
        });
      }

      if (items.length === 0) {
        return jsonError(404, "CERTIFICATES_NOT_FOUND", "No valid certificates found.");
      }

      const bulkBytes = await renderBulkCertificatesPdfBuffer(items);
      return new Response(Buffer.from(bulkBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Bulk_Certificates_${items.length}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const snap = await db.collection("certificates").doc(id).get();
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

    const template = await getCertificateTemplateById(
      cert.templateId || "TPL_CERT_SBCI_NAVY_GOLD"
    );
    const placeholders = await buildPlaceholdersForCert(cert, db);
    const verifyUrl = `${baseUrl}/verify/${cert.verificationId}`;

    const validation = validateCertificateBeforeExport({
      template,
      placeholders,
      verifyUrl,
    });
    if (!validation.valid) {
      return jsonError(400, "CERTIFICATE_VALIDATION_FAILED", validation.errors.join(" "));
    }

    const pdfBytes = await renderCertificatePdfBuffer({
      template,
      placeholders,
      verifyUrl,
    });

    const filename = buildCertificateDownloadFilename({
      instituteName: placeholders.institute_name || cert.instituteName,
      courseName: placeholders.course_name || cert.courseName,
      studentName: cert.studentName,
    });

    const format = request.nextUrl.searchParams.get("format");
    if (format === "html") {
      const QRCode = (await import("qrcode")).default;
      const { buildCertificateDocumentHtml } = await import("@/lib/pdf/certificate-html");
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 480,
        margin: 1,
      });
      const html = buildCertificateDocumentHtml({
        template,
        placeholders,
        qrDataUrl,
      }).replace(
        "</body>",
        `<script>window.addEventListener("load", () => { Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]).then(() => setTimeout(() => window.print(), 200)); });</script></body>`
      );
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const download = request.nextUrl.searchParams.get("download") === "1";

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
