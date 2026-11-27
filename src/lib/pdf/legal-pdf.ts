import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LEGAL_ENTITY, type LegalDocument } from "@/config/legal";

const PAGE_WIDTH = 595.28; // A4 width in pt
const PAGE_HEIGHT = 841.89; // A4 height in pt
const MARGIN_X = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const TOP_START_Y = PAGE_HEIGHT - 56;
const BOTTOM_MARGIN = 64;

const COLOR_BRAND = rgb(0.145, 0.388, 0.922);
const COLOR_INK = rgb(0.067, 0.094, 0.153);
const COLOR_MUTED = rgb(0.294, 0.333, 0.388);
const COLOR_SUBTLE = rgb(0.45, 0.49, 0.55);
const COLOR_BORDER = rgb(0.86, 0.88, 0.91);
const COLOR_SURFACE = rgb(0.965, 0.973, 0.988);

function sanitizePdfText(input: string): string {
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\u20B9/g, "INR ")
    .replace(/[^\x20-\x7E]/g, " ");
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const clean = sanitizePdfText(text).trim();
  if (!clean) return [];

  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateLegalDocumentPdf(doc: LegalDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${LEGAL_ENTITY.brandName} - ${doc.title}`);
  pdf.setAuthor(LEGAL_ENTITY.brandName);
  pdf.setSubject(doc.description);
  pdf.setCreator(LEGAL_ENTITY.brandName);
  pdf.setProducer("CertiDesk Pro Legal PDF Engine");

  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [];
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  let y = TOP_START_Y;

  const drawTopBar = (targetPage: PDFPage) => {
    targetPage.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 6,
      width: PAGE_WIDTH,
      height: 6,
      color: COLOR_BRAND,
    });
  };

  drawTopBar(page);

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < BOTTOM_MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      drawTopBar(page);
      y = TOP_START_Y;
    }
  };

  // Document Header
  page.drawText(sanitizePdfText(LEGAL_ENTITY.brandName.toUpperCase()), {
    x: MARGIN_X,
    y,
    size: 9,
    font: fontBold,
    color: COLOR_BRAND,
  });
  page.drawText(sanitizePdfText(`${doc.eyebrow} | ${doc.version}`), {
    x: MARGIN_X + 120,
    y,
    size: 9,
    font: fontRegular,
    color: COLOR_SUBTLE,
  });
  y -= 24;

  const titleLines = wrapText(doc.title, fontBold, 20, CONTENT_WIDTH);
  for (const line of titleLines) {
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: 20,
      font: fontBold,
      color: COLOR_INK,
    });
    y -= 24;
  }
  y -= 2;

  const descLines = wrapText(doc.description, fontRegular, 10, CONTENT_WIDTH);
  for (const line of descLines) {
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: 10,
      font: fontRegular,
      color: COLOR_MUTED,
    });
    y -= 14;
  }
  y -= 10;

  // Metadata Box
  const metaBoxHeight = 56;
  ensureSpace(metaBoxHeight + 16);
  page.drawRectangle({
    x: MARGIN_X,
    y: y - metaBoxHeight,
    width: CONTENT_WIDTH,
    height: metaBoxHeight,
    color: COLOR_SURFACE,
    borderColor: COLOR_BORDER,
    borderWidth: 0.75,
  });

  const col1X = MARGIN_X + 12;
  const col2X = MARGIN_X + CONTENT_WIDTH / 2 + 6;
  page.drawText(`Effective Date: ${sanitizePdfText(doc.effectiveDate)}`, {
    x: col1X,
    y: y - 18,
    size: 8.5,
    font: fontBold,
    color: COLOR_INK,
  });
  page.drawText(`Last Updated: ${sanitizePdfText(doc.lastUpdated)}`, {
    x: col2X,
    y: y - 18,
    size: 8.5,
    font: fontBold,
    color: COLOR_INK,
  });
  page.drawText(`Jurisdiction: ${sanitizePdfText(doc.jurisdiction)}`, {
    x: col1X,
    y: y - 34,
    size: 8.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });
  page.drawText(`Applies To: ${sanitizePdfText(doc.audience)}`, {
    x: col2X,
    y: y - 34,
    size: 8.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });
  page.drawText(`Official Contact: ${sanitizePdfText(LEGAL_ENTITY.supportEmail)}`, {
    x: col1X,
    y: y - 48,
    size: 8,
    font: fontRegular,
    color: COLOR_SUBTLE,
  });
  y -= metaBoxHeight + 16;

  // Key Highlights
  if (doc.highlights.length > 0) {
    ensureSpace(48);
    page.drawText("KEY POLICY HIGHLIGHTS", {
      x: MARGIN_X,
      y,
      size: 8.5,
      font: fontBold,
      color: COLOR_BRAND,
    });
    y -= 14;

    for (const item of doc.highlights) {
      const lines = wrapText(item, fontRegular, 9.5, CONTENT_WIDTH - 16);
      ensureSpace(lines.length * 13 + 4);
      page.drawText("-", {
        x: MARGIN_X + 4,
        y,
        size: 9.5,
        font: fontBold,
        color: COLOR_BRAND,
      });
      for (const line of lines) {
        page.drawText(line, {
          x: MARGIN_X + 16,
          y,
          size: 9.5,
          font: fontRegular,
          color: COLOR_INK,
        });
        y -= 13;
      }
      y -= 2;
    }
    y -= 8;
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_WIDTH - MARGIN_X, y },
      thickness: 0.75,
      color: COLOR_BORDER,
    });
    y -= 18;
  }

  // Document Sections
  for (const section of doc.sections) {
    const headingLines = wrapText(section.heading, fontBold, 12, CONTENT_WIDTH);
    ensureSpace(headingLines.length * 16 + 24);

    for (const line of headingLines) {
      page.drawText(line, {
        x: MARGIN_X,
        y,
        size: 12,
        font: fontBold,
        color: COLOR_INK,
      });
      y -= 16;
    }
    y -= 3;

    for (const para of section.paragraphs) {
      const pLines = wrapText(para, fontRegular, 9.75, CONTENT_WIDTH);
      for (const line of pLines) {
        ensureSpace(14);
        page.drawText(line, {
          x: MARGIN_X,
          y,
          size: 9.75,
          font: fontRegular,
          color: COLOR_MUTED,
        });
        y -= 13.5;
      }
      y -= 5;
    }

    if (section.bullets && section.bullets.length > 0) {
      for (const bullet of section.bullets) {
        const bLines = wrapText(bullet, fontRegular, 9.5, CONTENT_WIDTH - 18);
        ensureSpace(bLines.length * 13 + 4);
        page.drawText("*", {
          x: MARGIN_X + 6,
          y,
          size: 9.5,
          font: fontBold,
          color: COLOR_BRAND,
        });
        for (const line of bLines) {
          ensureSpace(13.5);
          page.drawText(line, {
            x: MARGIN_X + 18,
            y,
            size: 9.5,
            font: fontRegular,
            color: COLOR_MUTED,
          });
          y -= 13;
        }
        y -= 3;
      }
    }

    y -= 10;
  }

  // Footer across all pages
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    p.drawLine({
      start: { x: MARGIN_X, y: 42 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: 42 },
      thickness: 0.5,
      color: COLOR_BORDER,
    });
    p.drawText(
      sanitizePdfText(
        `${LEGAL_ENTITY.brandName} | ${doc.title} (${doc.version}) | Effective ${doc.effectiveDate}`
      ),
      {
        x: MARGIN_X,
        y: 28,
        size: 8,
        font: fontRegular,
        color: COLOR_SUBTLE,
      }
    );
    const pageLabel = `Page ${idx + 1} of ${totalPages}`;
    const labelWidth = fontRegular.widthOfTextAtSize(pageLabel, 8);
    p.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN_X - labelWidth,
      y: 28,
      size: 8,
      font: fontRegular,
      color: COLOR_SUBTLE,
    });
  });

  return pdf.save();
}
