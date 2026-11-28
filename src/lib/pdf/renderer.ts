import "server-only";
import { existsSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import {
  resolveApprovedPlaceholders,
  type CertificatePlaceholderValues,
} from "./certificate-placeholders";
import { buildCertificateDocumentHtml } from "./certificate-html";
import type {
  CertificateTemplateRecord,
  MarksheetTemplateRecord,
} from "@/types/templates";
import type { StudentMarksheetRecord } from "@/types/academic";

export { resolveApprovedPlaceholders };

const MM_TO_PT = 2.83465;

function findChromiumExecutable(): string | undefined {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter((p): p is string => Boolean(p));

  return candidates.find((p) => existsSync(p));
}

async function renderCertificateWithChromium(params: {
  template: CertificateTemplateRecord;
  placeholders: CertificatePlaceholderValues;
  verifyUrl: string;
}): Promise<Uint8Array | null> {
  const executablePath = findChromiumExecutable();
  if (!executablePath) return null;

  try {
    const { chromium } = await import("playwright-core");
    const qrDataUrl = await QRCode.toDataURL(params.verifyUrl, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    const html = buildCertificateDocumentHtml({
      template: params.template,
      placeholders: params.placeholders,
      qrDataUrl,
    });

    const browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1123, height: 794 },
        deviceScaleFactor: 2,
      });
      await page.setContent(html, { waitUntil: "load", timeout: 10000 });
      await page.evaluate(async () => {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
        const imgs = Array.from(document.images);
        await Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                })
          )
        );
      });
      const pdfBuffer = await page.pdf({
        width: `${params.template.widthMm}mm`,
        height: `${params.template.heightMm}mm`,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      return new Uint8Array(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
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

/**
 * Standard PDF fonts (Helvetica, TimesRoman, Courier) only support WinAnsi (Latin-1).
 * Replace common Unicode symbols so pdf-lib never throws an encoding error.
 */
function toWinAnsiSafe(text: string): string {
  return text
    .replace(/★/g, "*")
    .replace(/[•·]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/₹/g, "Rs.")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

export async function renderCertificatePdfBuffer(params: {
  template: CertificateTemplateRecord;
  placeholders: CertificatePlaceholderValues;
  verifyUrl: string;
}): Promise<Uint8Array> {
  // Primary: Pixel-perfect Chromium HTML/CSS + Vector SVG + Google Fonts PDF
  const chromiumPdf = await renderCertificateWithChromium(params);
  if (chromiumPdf) {
    return chromiumPdf;
  }

  // Fallback: Vector pdf-lib renderer (used when no Chromium binary is available)
  const { template, placeholders, verifyUrl } = params;
  const pdfDoc = await PDFDocument.create();
  const pageWidthPt = (template.orientation === "landscape" ? 297 : 210) * MM_TO_PT;
  const pageHeightPt = (template.orientation === "landscape" ? 210 : 297) * MM_TO_PT;
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  const navyColor = parseHexColor(template.secondaryColorHex || "#0C2340");
  const goldColor = parseHexColor(
    template.accentColorHex || template.borderColorHex || "#D4AF37"
  );

  // Background & Double Gold Border
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidthPt,
    height: pageHeightPt,
    color: parseHexColor(template.backgroundColorHex),
  });

  // Sweeping Corner Accents (Top-Right & Bottom-Left)
  if (template.showCornerDecorations !== false) {
    page.drawCircle({
      x: pageWidthPt - 10 * MM_TO_PT,
      y: pageHeightPt - 10 * MM_TO_PT,
      size: 46 * MM_TO_PT,
      color: goldColor,
      opacity: 0.9,
    });
    page.drawCircle({
      x: pageWidthPt - 4 * MM_TO_PT,
      y: pageHeightPt - 4 * MM_TO_PT,
      size: 40 * MM_TO_PT,
      color: navyColor,
    });
    page.drawCircle({
      x: 10 * MM_TO_PT,
      y: 10 * MM_TO_PT,
      size: 46 * MM_TO_PT,
      color: goldColor,
      opacity: 0.9,
    });
    page.drawCircle({
      x: 4 * MM_TO_PT,
      y: 4 * MM_TO_PT,
      size: 40 * MM_TO_PT,
      color: navyColor,
    });
  }

  page.drawRectangle({
    x: 8 * MM_TO_PT,
    y: 8 * MM_TO_PT,
    width: pageWidthPt - 16 * MM_TO_PT,
    height: pageHeightPt - 16 * MM_TO_PT,
    borderColor: goldColor,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 10.5 * MM_TO_PT,
    y: 10.5 * MM_TO_PT,
    width: pageWidthPt - 21 * MM_TO_PT,
    height: pageHeightPt - 21 * MM_TO_PT,
    borderColor: goldColor,
    borderWidth: 0.9,
  });

  if (template.watermarkText) {
    page.drawText(toWinAnsiSafe(template.watermarkText), {
      x: pageWidthPt * 0.28,
      y: pageHeightPt * 0.48,
      size: 38,
      font: helveticaBold,
      color: rgb(0.92, 0.94, 0.97),
    });
  }

  for (const el of template.elements) {
    if (el.visible === false) continue;
    const xPt = el.xMm * MM_TO_PT;
    const widthPt = el.widthMm * MM_TO_PT;
    const heightPt = el.heightMm * MM_TO_PT;
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
        width: 300,
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

    if (el.type === "medal") {
      const cx = xPt + widthPt / 2;
      const cy = pageHeightPt - yPtTop - widthPt / 2;
      page.drawCircle({
        x: cx,
        y: cy,
        size: (widthPt / 2) * 0.88,
        color: goldColor,
      });
      page.drawCircle({
        x: cx,
        y: cy,
        size: (widthPt / 2) * 0.72,
        color: navyColor,
      });
      page.drawText("CERTIFIED", {
        x: cx - 18,
        y: cy + 2,
        size: 6.5,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
      page.drawText("STUDENT", {
        x: cx - 15,
        y: cy - 7,
        size: 6.5,
        font: helveticaBold,
        color: goldColor,
      });
      continue;
    }

    if (el.type === "seal") {
      const cx = xPt + widthPt / 2;
      const cy = pageHeightPt - yPtTop - heightPt / 2;
      page.drawCircle({
        x: cx,
        y: cy,
        size: (Math.min(widthPt, heightPt) / 2) * 0.9,
        borderColor: navyColor,
        borderWidth: 1.6,
      });
      page.drawText("VERIFIED SEAL", {
        x: cx - 22,
        y: cy - 3,
        size: 6,
        font: helveticaBold,
        color: navyColor,
      });
      continue;
    }

    if (el.type === "image") {
      if (!el.content.includes("institute_logo")) {
        page.drawLine({
          start: { x: xPt, y: pageHeightPt - yPtTop - heightPt + 2 },
          end: { x: xPt + widthPt, y: pageHeightPt - yPtTop - heightPt + 2 },
          thickness: 0.8,
          color: navyColor,
        });
      }
      continue;
    }

    const resolvedText = toWinAnsiSafe(
      resolveApprovedPlaceholders(el.content, placeholders)
    );
    if (!resolvedText.trim()) continue;

    if (el.type === "banner" || el.type === "ribbon" || el.type === "pill") {
      const bg = parseHexColor(
        el.backgroundColorHex || (el.type === "ribbon" ? "#F5DE83" : "#0C2340")
      );
      page.drawRectangle({
        x: xPt,
        y: pageHeightPt - yPtTop - heightPt,
        width: widthPt,
        height: heightPt,
        color: bg,
        borderColor: el.borderColorHex ? parseHexColor(el.borderColorHex) : goldColor,
        borderWidth: el.type === "banner" ? 1.5 : 0.8,
      });
    }

    const useSerif =
      el.fontFamily === "TimesRoman" ||
      el.fontFamily === "Cinzel Decorative" ||
      el.fontFamily === "Cormorant Garamond" ||
      el.fontFamily === "Libre Baskerville" ||
      el.fontFamily === "Great Vibes" ||
      el.fontFamily === "Allura";

    const font = useSerif
      ? el.fontFamily === "Great Vibes" || el.fontFamily === "Allura"
        ? timesBoldItalic
        : el.fontStyle === "italic"
          ? el.fontWeight === "bold"
            ? timesBoldItalic
            : timesItalic
          : el.fontWeight === "bold"
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

    const drawY =
      el.type === "banner" || el.type === "ribbon" || el.type === "pill"
        ? pageHeightPt - yPtTop - (heightPt + el.fontSizePt * 0.72) / 2
        : pageHeightPt - yPtTop - el.fontSizePt;

    page.drawText(resolvedText, {
      x: drawX,
      y: drawY,
      size: el.fontSizePt,
      font,
      color: parseHexColor(el.colorHex),
    });
  }

  return pdfDoc.save();
}

export async function renderBulkCertificatesPdfBuffer(
  items: Array<{
    template: CertificateTemplateRecord;
    placeholders: CertificatePlaceholderValues;
    verifyUrl: string;
  }>
): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const item of items) {
    const singleBytes = await renderCertificatePdfBuffer(item);
    const singleDoc = await PDFDocument.load(singleBytes);
    const copiedPages = await merged.copyPages(singleDoc, singleDoc.getPageIndices());
    for (const p of copiedPages) {
      merged.addPage(p);
    }
  }
  return merged.save();
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
