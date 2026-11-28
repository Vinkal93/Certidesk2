import type { CertificateTemplateRecord } from "@/types/templates";
import type { CertificatePlaceholderValues } from "./certificate-placeholders";

export interface CertificateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCertificateBeforeExport(params: {
  template: CertificateTemplateRecord;
  placeholders: CertificatePlaceholderValues;
  verifyUrl?: string;
}): CertificateValidationResult {
  const { template, placeholders, verifyUrl } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (template.widthMm !== 297 || template.heightMm !== 210) {
    errors.push(
      `Invalid page dimensions (${template.widthMm}mm × ${template.heightMm}mm). Expected A4 Landscape (297mm × 210mm).`
    );
  }

  let hasQr = false;
  for (const el of template.elements) {
    if (el.visible === false) continue;
    if (el.type === "qr_code") hasQr = true;

    if (
      el.xMm < 0 ||
      el.yMm < 0 ||
      el.xMm + el.widthMm > template.widthMm + 0.5 ||
      el.yMm + el.heightMm > template.heightMm + 0.5
    ) {
      errors.push(
        `Element "${el.label}" (${el.xMm}mm, ${el.yMm}mm, ${el.widthMm}×${el.heightMm}mm) extends outside the A4 page boundary.`
      );
    }

    if (el.type === "text" || el.type === "placeholder") {
      const approxCharsPerLine = Math.max(
        8,
        Math.floor((el.widthMm * 2.83465) / (el.fontSizePt * 0.48))
      );
      if (!el.content.includes("{{") && el.content.length > approxCharsPerLine * 3) {
        warnings.push(`Text in "${el.label}" may overflow its ${el.widthMm}mm box.`);
      }
    }
  }

  if (!hasQr) {
    warnings.push("No verification QR code element is placed on this template.");
  } else if (!verifyUrl || !verifyUrl.startsWith("http")) {
    warnings.push(
      "Verification URL is missing or relative; QR code may not resolve externally."
    );
  }

  if (!placeholders.student_name?.trim()) {
    warnings.push("Student name is empty.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
