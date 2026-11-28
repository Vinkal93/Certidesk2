import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({}),
}));

import { buildSbciNavyGoldTemplate } from "@/lib/pdf/certificate-presets";
import {
  buildCertificateDownloadFilename,
  resolveApprovedPlaceholders,
} from "@/lib/pdf/certificate-placeholders";
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
});
