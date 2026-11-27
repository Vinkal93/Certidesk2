import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import type {
  CertificateTemplateRecord,
  MarksheetTemplateRecord,
} from "@/types/templates";
import type { StudentMarksheetRecord } from "@/types/academic";

const MM_TO_PT = 2.83465;

const APPROVED_PLACEHOLDER_KEYS = [
  "student_name",
  "student_id",
  "course_name",
  "institute_name",
  "certificate_number",
  "issue_date",
  "grade",
  "result",
  "exam_name",
] as const;

export function resolveApprovedPlaceholders(
  templateText: string,
  values: Partial<Record<(typeof APPROVED_PLACEHOLDER_KEYS)[number], string>>
): string {
  return templateText.replace(/\{\{([a-z_]+)\}\}/g, (_match, key: string) => {
    if ((APPROVED_PLACEHOLDER_KEYS as readonly string[]).includes(key)) {
      return values[key as (typeof APPROVED_PLACEHOLDER_KEYS)[number]] ?? "";
    }
    return "";
  });
}

function parseHexColor(hex: string) {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return rgb(0.07, 0.09, 0.15);
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export async function renderCertificatePdfBuffer(params: {
  template: CertificateTemplateRecord;
  placeholders: Partial<Record<(typeof APPROVED_PLACEHOLDER_KEYS)[number], string>>;
  verifyUrl: string;
}): Promise<Uint8Array> {
  const { template, placeholders, verifyUrl } = params;
  const pdfDoc = await PDFDocument.create();
  const pageWidthPt = (template.orientation === "landscape" ? 297 : 210) * MM_TO_PT;
  const pageHeightPt = (template.orientation === "landscape" ? 210 : 297) * MM_TO_PT;
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  // Background & Border
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidthPt,
    height: pageHeightPt,
    color: parseHexColor(template.backgroundColorHex),
  });
  page.drawRectangle({
    x: 10 * MM_TO_PT,
    y: 10 * MM_TO_PT,
    width: pageWidthPt - 20 * MM_TO_PT,
    height: pageHeightPt - 20 * MM_TO_PT,
    borderColor: parseHexColor(template.borderColorHex),
    borderWidth: 2,
  });

  if (template.watermarkText) {
    page.drawText(template.watermarkText, {
      x: pageWidthPt * 0.28,
      y: pageHeightPt * 0.48,
      size: 42,
      font: helveticaBold,
      color: rgb(0.92, 0.94, 0.97),
    });
  }

  for (const el of template.elements) {
    const xPt = el.xMm * MM_TO_PT;
    const widthPt = el.widthMm * MM_TO_PT;
    const yPtTop = el.yMm * MM_TO_PT;

    if (el.type === "divider") {
      page.drawLine({
        start: { x: xPt, y: pageHeightPt - yPtTop },
        end: { x: xPt + widthPt, y: pageHeightPt - yPtTop },
        thickness: 1.2,
        color: parseHexColor(el.colorHex),
      });
      continue;
    }

    if (el.type === "qr_code") {
      const qrPng = await QRCode.toBuffer(verifyUrl, {
        width: 240,
        margin: 1,
      });
      const qrImage = await pdfDoc.embedPng(qrPng);
      const sizePt = Math.max(18, el.widthMm) * MM_TO_PT;
      page.drawImage(qrImage, {
        x: xPt,
        y: pageHeightPt - yPtTop - sizePt,
        width: sizePt,
        height: sizePt,
      });
      continue;
    }

    const resolvedText = resolveApprovedPlaceholders(el.content, placeholders);
    const font =
      el.fontFamily === "TimesRoman"
        ? el.fontWeight === "bold"
          ? timesBold
          : times
        : el.fontFamily === "Courier"
          ? courier
          : el.fontWeight === "bold"
            ? helveticaBold
            : helvetica;

    const textWidth = font.widthOfTextAtSize(resolvedText, el.fontSizePt);
    const drawX =
      el.align === "center"
        ? xPt + Math.max(0, (widthPt - textWidth) / 2)
        : el.align === "right"
          ? xPt + Math.max(0, widthPt - textWidth)
          : xPt;

    page.drawText(resolvedText, {
      x: drawX,
      y: pageHeightPt - yPtTop - el.fontSizePt,
      size: el.fontSizePt,
      font,
      color: parseHexColor(el.colorHex),
    });
  }

  return pdfDoc.save();
}

export async function renderMarksheetPdfBuffer(params: {
  template: MarksheetTemplateRecord;
  marksheet: StudentMarksheetRecord;
  instituteName: string;
  verifyUrl: string;
}): Promise<Uint8Array> {
  const { template, marksheet, instituteName, verifyUrl } = params;
  const pdfDoc = await PDFDocument.create();
  const pageWidthPt = (template.orientation === "landscape" ? 297 : 210) * MM_TO_PT;
  const pageHeightPt = (template.orientation === "landscape" ? 210 : 297) * MM_TO_PT;
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 12 * MM_TO_PT,
    y: 12 * MM_TO_PT,
    width: pageWidthPt - 24 * MM_TO_PT,
    height: pageHeightPt - 24 * MM_TO_PT,
    borderColor: rgb(0.15, 0.25, 0.45),
    borderWidth: 1.5,
  });

  let cursorY = pageHeightPt - 26 * MM_TO_PT;
  page.drawText(instituteName, {
    x: 20 * MM_TO_PT,
    y: cursorY,
    size: 18,
    font: bold,
    color: rgb(0.07, 0.09, 0.15),
  });
  cursorY -= 20;
  page.drawText(template.headerTitle, {
    x: 20 * MM_TO_PT,
    y: cursorY,
    size: 13,
    font: bold,
    color: rgb(0, 0.32, 1),
  });
  cursorY -= 24;

  page.drawText(
    `Student: ${marksheet.studentName} (${marksheet.studentCode})   |   Batch: ${marksheet.batchName}`,
    { x: 20 * MM_TO_PT, y: cursorY, size: 10, font: regular }
  );
  cursorY -= 16;
  page.drawText(
    `Examination: ${marksheet.examTitle}   |   Marksheet ID: ${marksheet.id}`,
    { x: 20 * MM_TO_PT, y: cursorY, size: 10, font: regular }
  );
  cursorY -= 24;

  // Table header
  const tableX = 20 * MM_TO_PT;
  const tableWidth = pageWidthPt - 40 * MM_TO_PT;
  page.drawRectangle({
    x: tableX,
    y: cursorY - 18,
    width: tableWidth,
    height: 20,
    color: rgb(0.95, 0.96, 0.98),
  });

  let colX = tableX + 6;
  for (const col of template.columns) {
    page.drawText(col.label, { x: colX, y: cursorY - 12, size: 9, font: bold });
    colX += (col.widthPercent / 100) * tableWidth;
  }
  cursorY -= 24;

  for (const entry of marksheet.marks) {
    let rowX = tableX + 6;
    for (const col of template.columns) {
      const val =
        col.key === "subjectName"
          ? entry.subjectName
          : col.key === "maxMarks"
            ? String(entry.maxMarks)
            : col.key === "passingMarks"
              ? String(Math.round(entry.maxMarks * 0.35))
              : col.key === "obtainedMarks"
                ? String(entry.obtainedMarks)
                : col.key === "status"
                  ? entry.obtainedMarks >= entry.maxMarks * 0.35
                    ? "PASS"
                    : "FAIL"
                  : "";
      page.drawText(val, { x: rowX, y: cursorY - 10, size: 9, font: regular });
      rowX += (col.widthPercent / 100) * tableWidth;
    }
    cursorY -= 18;
  }

  cursorY -= 14;
  page.drawText(
    `Total: ${marksheet.totalObtained} / ${marksheet.totalMax}   |   Percentage: ${marksheet.percentage}%   |   Grade: ${marksheet.grade}   |   Result: ${marksheet.result}`,
    { x: tableX, y: cursorY, size: 11, font: bold }
  );

  const qrPng = await QRCode.toBuffer(verifyUrl, { width: 180, margin: 1 });
  const qrImg = await pdfDoc.embedPng(qrPng);
  page.drawImage(qrImg, {
    x: pageWidthPt - 44 * MM_TO_PT,
    y: 18 * MM_TO_PT,
    width: 24 * MM_TO_PT,
    height: 24 * MM_TO_PT,
  });

  page.drawText(template.footerNote, {
    x: tableX,
    y: 20 * MM_TO_PT,
    size: 8.5,
    font: regular,
    color: rgb(0.42, 0.45, 0.5),
  });

  return pdfDoc.save();
}
