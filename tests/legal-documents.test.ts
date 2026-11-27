import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENTS, getLegalDocument } from "@/config/legal";
import { generateLegalDocumentPdf } from "@/lib/pdf/legal-pdf";

describe("Legal & Compliance Suite", () => {
  it("defines all 7 official legal documents with structured sections", () => {
    const expectedSlugs = [
      "privacy",
      "terms",
      "refund-policy",
      "cookie-policy",
      "acceptable-use",
      "dpa",
      "sla",
    ];
    expect(LEGAL_DOCUMENTS.map((d) => d.slug)).toEqual(expectedSlugs);

    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.title.length).toBeGreaterThan(5);
      expect(doc.sections.length).toBeGreaterThanOrEqual(4);
      expect(doc.pdfFilename.endsWith(".pdf")).toBe(true);
      expect(getLegalDocument(doc.slug)).toBeDefined();
    }
  });

  it("generates a valid multi-page PDF for every legal document", async () => {
    for (const doc of LEGAL_DOCUMENTS) {
      const bytes = await generateLegalDocumentPdf(doc);
      expect(bytes.byteLength).toBeGreaterThan(1500);
      const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
      expect(header).toBe("%PDF-");
    }
  });
});
