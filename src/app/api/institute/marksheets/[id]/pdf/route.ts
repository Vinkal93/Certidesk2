import { NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getServerEnv } from "@/config/env.server";
import { institutesCollection } from "@/lib/firebase/firestore";
import { requireSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { getMarksheetTemplateById } from "@/services/template-studio.service";
import { renderMarksheetPdfBuffer } from "@/lib/pdf/renderer";
import { handleApiError, jsonError } from "@/lib/utils/api-response";
import type { StudentMarksheetRecord } from "@/types/academic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireSessionUser();
    const { id } = await context.params;
    const snap = await getAdminFirestore().collection("marksheets").doc(id).get();
    const marksheet = snap.data() as StudentMarksheetRecord | undefined;

    if (!snap.exists || !marksheet) {
      return jsonError(404, "MARKSHEET_NOT_FOUND", "Marksheet not found.");
    }

    if (actor.role === "student") {
      if (
        marksheet.studentId !== actor.studentId ||
        marksheet.instituteId !== actor.instituteId ||
        !marksheet.published
      ) {
        return jsonError(403, "FORBIDDEN", "Access denied.");
      }
    } else if (actor.role !== "super_admin") {
      const institute = await resolveAuthorizedInstitute(actor);
      if (marksheet.instituteId !== institute.id) {
        return jsonError(403, "FORBIDDEN", "Cross-institute access denied.");
      }
    }

    const instSnap = await institutesCollection().doc(marksheet.instituteId).get();
    const instituteName = instSnap.data()?.name ?? "CertiDesk Institute";
    const template = await getMarksheetTemplateById("TPL_MKS_STANDARD_A4");
    const baseUrl = getServerEnv().APP_BASE_URL.replace(/\/+$/, "");

    const pdfBytes = await renderMarksheetPdfBuffer({
      template,
      marksheet,
      instituteName,
      verifyUrl: `${baseUrl}/verify/${marksheet.id}`,
    });

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${marksheet.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
