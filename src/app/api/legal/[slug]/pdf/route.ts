import { NextRequest, NextResponse } from "next/server";
import { getLegalDocument } from "@/config/legal";
import { generateLegalDocumentPdf } from "@/lib/pdf/legal-pdf";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const doc = getLegalDocument(slug);

  if (!doc) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Legal document not found." } },
      { status: 404 }
    );
  }

  const pdfBytes = await generateLegalDocumentPdf(doc);
  const inline = request.nextUrl.searchParams.get("inline") === "1";

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${doc.pdfFilename}"`,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
