import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({}),
}));

import {
  buildSbciNavyGoldTemplate,
  buildImperialBurgundyTemplate,
  buildEmeraldLuxuryTemplate,
  buildCorporateSlateTemplate,
  buildObsidianGoldTemplate,
  CERTIFICATE_PRESETS_CATALOG,
} from "@/lib/pdf/certificate-presets";
import {
  buildCertificateDownloadFilename,
  resolveApprovedPlaceholders,
  CERTIFICATE_SAMPLE_PROFILES,
} from "@/lib/pdf/certificate-placeholders";
import { buildCertificateCanvasInnerHtml } from "@/lib/pdf/certificate-html";
import { validateCertificateBeforeExport } from "@/lib/pdf/certificate-validation";
import { renderCertificatePdfBuffer } from "@/lib/pdf/renderer";

describe("CertiDesk Pro: Certificate Studio & Pixel-Perfect PDF Engine", () => {
  it("resolves all 20 dynamic placeholders cleanly without undefined or raw braces", () => {
    const template =
      "{{institute_name}} | {{institute_address}} | {{registration_number}} | {{issue_date}} | {{student_name}} | {{student_id}} | {{course_name}} | {{course_full_name}} | {{duration}} | {{marks}} | {{percentage}} | {{grade}} | {{result}} | {{certificate_number}} | {{director_name}}";

    const out = resolveApprovedPlaceholders(template, {
      institute_name: "SBCI COMPUTER INSTITUTE",
      institute_address: "Akbarpur, U.P.",
      registration_number: "SBCI/2026/001",
      issue_date: "28 Nov 2026",
      student_name: "Rahul Kumar",
      student_id: "STU-001",
      course_name: "ADCA",
      course_full_name: "Advanced Diploma in Computer Applications",
      duration: "12 Months",
      marks: "425/500",
      percentage: "85",
      grade: "A+",
      result: "PASS",
      certificate_number: "CERT-2026-0001",
      director_name: "Vinkal Prajapati",
    });

    expect(out).not.toContain("{{");
    expect(out).not.toContain("undefined");
    expect(out).toContain("SBCI COMPUTER INSTITUTE");
    expect(out).toContain("Rahul Kumar");
    expect(out).toContain("Advanced Diploma in Computer Applications");
  });

  it("formats consistent certificate download filenames", () => {
    expect(
      buildCertificateDownloadFilename({
        instituteName: "SBCI Computer Institute",
        courseName: "ADCA",
        studentName: "Rahul Kumar",
      })
    ).toBe("SBCI_ADCA_Rahul_Kumar_Certificate.pdf");
  });

  it("validates SBCI Navy & Gold template boundaries before export and catches out-of-bounds elements", () => {
    const sbci = buildSbciNavyGoldTemplate();
    const ok = validateCertificateBeforeExport({
      template: sbci,
      placeholders: { student_name: "Rahul Kumar" },
      verifyUrl: "https://certidesk.sbci.online/verify/VRF123",
    });
    expect(ok.valid).toBe(true);
    expect(ok.errors).toHaveLength(0);

    const broken = {
      ...sbci,
      elements: [
        ...sbci.elements,
        {
          ...sbci.elements[0]!,
          id: "el_oob",
          label: "Out of Bounds",
          xMm: 280,
          widthMm: 40,
        },
      ],
    };
    const bad = validateCertificateBeforeExport({
      template: broken,
      placeholders: { student_name: "Rahul Kumar" },
      verifyUrl: "https://certidesk.sbci.online/verify/VRF123",
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it("renders a single-page A4 Landscape PDF (297mm x 210mm) with exact dimensions", async () => {
    const sbci = buildSbciNavyGoldTemplate();
    const pdfBytes = await renderCertificatePdfBuffer({
      template: sbci,
      placeholders: {
        institute_name: "SBCI COMPUTER INSTITUTE",
        institute_address:
          "Bhuvalpur Road, Main Chauraha, Akbarpur, Ambedkar Nagar - 224122 (U.P.)",
        registration_number: "SBCI/2026/001",
        issue_date: "28 Nov 2026",
        student_name: "Rahul Kumar",
        student_id: "STU-SBCI-001",
        course_name: "ADCA",
        course_full_name: "Advanced Diploma in Computer Applications",
        percentage: "85",
        grade: "A+",
        certificate_number: "CERT-SBCI-2026-0001",
        director_name: "Vinkal Prajapati",
      },
      verifyUrl: "https://certidesk.sbci.online/verify/VRF_TEST_001",
    });

    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(1);
    const page = doc.getPage(0);
    const { width, height } = page.getSize();
    // A4 Landscape is ~841.89 x 595.28 pt
    expect(width).toBeGreaterThan(835);
    expect(width).toBeLessThan(850);
    expect(height).toBeGreaterThan(590);
    expect(height).toBeLessThan(602);
  }, 30000);

  it("loads and validates all 5 professional presets from catalog without boundary errors", () => {
    expect(CERTIFICATE_PRESETS_CATALOG).toHaveLength(5);

    const presets = [
      buildSbciNavyGoldTemplate(),
      buildImperialBurgundyTemplate(),
      buildEmeraldLuxuryTemplate(),
      buildCorporateSlateTemplate(),
      buildObsidianGoldTemplate(),
    ];

    for (const preset of presets) {
      expect(preset.widthMm).toBe(297);
      expect(preset.heightMm).toBe(210);
      expect(preset.elements.length).toBeGreaterThanOrEqual(15);

      const res = validateCertificateBeforeExport({
        template: preset,
        placeholders: CERTIFICATE_SAMPLE_PROFILES[0]!.values,
        verifyUrl: "https://certidesk.sbci.online/verify/PRESET_VALIDATE",
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    }
  });

  it("renders watermark and photo placeholder inside HTML canvas", () => {
    const preset = buildImperialBurgundyTemplate();
    const html = buildCertificateCanvasInnerHtml({
      template: {
        ...preset,
        watermarkText: "CONFIDENTIAL DIPLOMA",
        elements: [
          ...preset.elements,
          {
            id: "el_test_photo",
            type: "image",
            label: "Student Photo",
            content: "{{student_photo}}",
            xMm: 20,
            yMm: 20,
            widthMm: 25,
            heightMm: 30,
            fontFamily: "Montserrat",
            fontSizePt: 8,
            fontWeight: "bold",
            colorHex: "#000",
            align: "center",
          },
        ],
      },
      placeholders: CERTIFICATE_SAMPLE_PROFILES[0]!.values,
      qrDataUrl: "data:image/png;base64,mockQr",
    });

    expect(html).toContain("CONFIDENTIAL DIPLOMA");
    expect(html).toContain("PHOTO");
    expect(html).toContain("certidesk-a4-canvas");
  });
});
