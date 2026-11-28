import type {
  CertificateTemplateElement,
  CertificateTemplateRecord,
  TemplateFontFamily,
} from "@/types/templates";
import {
  resolveApprovedPlaceholders,
  type CertificatePlaceholderValues,
} from "./certificate-placeholders";

export const CERTIFICATE_GOOGLE_FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Allura&family=Cinzel+Decorative:wght@700;900&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Great+Vibes&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@500;600;700;800&display=swap";

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function mapFontFamilyCss(family: TemplateFontFamily): string {
  switch (family) {
    case "Cinzel Decorative":
      return "'Cinzel Decorative', 'Cormorant Garamond', Georgia, serif";
    case "Cormorant Garamond":
      return "'Cormorant Garamond', Georgia, serif";
    case "Great Vibes":
      return "'Great Vibes', 'Allura', cursive";
    case "Allura":
      return "'Allura', 'Great Vibes', cursive";
    case "Montserrat":
      return "'Montserrat', 'Helvetica Neue', Arial, sans-serif";
    case "Libre Baskerville":
      return "'Libre Baskerville', Georgia, serif";
    case "TimesRoman":
      return "'Libre Baskerville', 'Times New Roman', Georgia, serif";
    case "Courier":
      return "'Courier New', Courier, monospace";
    case "Helvetica":
    default:
      return "'Montserrat', 'Helvetica Neue', Arial, sans-serif";
  }
}

function renderSvgCornerDecorations(navyHex: string, goldHex: string): string {
  return `
  <!-- Top-Right Sweeping Navy & Gold Corner Ribbons -->
  <svg viewBox="0 0 297 210" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;">
    <defs>
      <linearGradient id="goldGradTR" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#B8860B"/>
        <stop offset="45%" stop-color="#F5DE83"/>
        <stop offset="75%" stop-color="${escapeHtml(goldHex)}"/>
        <stop offset="100%" stop-color="#9A7209"/>
      </linearGradient>
      <linearGradient id="goldGradBL" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#9A7209"/>
        <stop offset="45%" stop-color="#F5DE83"/>
        <stop offset="80%" stop-color="${escapeHtml(goldHex)}"/>
        <stop offset="100%" stop-color="#B8860B"/>
      </linearGradient>
    </defs>
    <!-- Top Right -->
    <path d="M 190 0 C 235 8, 275 35, 297 72 L 297 0 Z" fill="url(#goldGradTR)"/>
    <path d="M 214 0 C 252 10, 280 32, 297 56 L 297 0 Z" fill="${escapeHtml(navyHex)}"/>
    <path d="M 244 0 C 268 8, 286 22, 297 38 L 297 0 Z" fill="url(#goldGradTR)" opacity="0.92"/>
    <path d="M 262 0 C 278 6, 289 15, 297 25 L 297 0 Z" fill="${escapeHtml(navyHex)}"/>

    <!-- Bottom Left -->
    <path d="M 0 112 C 18 158, 52 190, 108 210 L 0 210 Z" fill="url(#goldGradBL)"/>
    <path d="M 0 128 C 16 165, 45 194, 88 210 L 0 210 Z" fill="${escapeHtml(navyHex)}"/>
    <path d="M 0 150 C 12 178, 34 198, 66 210 L 0 210 Z" fill="url(#goldGradBL)"/>
    <path d="M 0 172 C 10 190, 24 202, 46 210 L 0 210 Z" fill="${escapeHtml(navyHex)}"/>
  </svg>`;
}

function renderSvgGuillocheBg(): string {
  return `
  <svg viewBox="0 0 297 210" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.42;">
    <path d="M 0 55 Q 75 25, 150 55 T 297 55" fill="none" stroke="#E8EDF5" stroke-width="0.6"/>
    <path d="M 0 62 Q 75 32, 150 62 T 297 62" fill="none" stroke="#E8EDF5" stroke-width="0.6"/>
    <path d="M 0 69 Q 75 39, 150 69 T 297 69" fill="none" stroke="#E8EDF5" stroke-width="0.6"/>
    <path d="M 0 142 Q 75 172, 150 142 T 297 142" fill="none" stroke="#E8EDF5" stroke-width="0.6"/>
    <path d="M 0 149 Q 75 179, 150 149 T 297 149" fill="none" stroke="#E8EDF5" stroke-width="0.6"/>
    <path d="M 0 156 Q 75 186, 150 156 T 297 156" fill="none" stroke="#E8EDF5" stroke-width="0.6"/>
  </svg>`;
}

function renderCertifiedMedalSvg(navyHex: string, goldHex: string): string {
  return `
  <svg viewBox="0 0 120 150" style="width:100%;height:100%;display:block;">
    <defs>
      <linearGradient id="medalGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F6E27A"/>
        <stop offset="50%" stop-color="${escapeHtml(goldHex)}"/>
        <stop offset="100%" stop-color="#9B720C"/>
      </linearGradient>
    </defs>
    <!-- Ribbons -->
    <polygon points="36,88 20,144 40,132 52,146 58,92" fill="${escapeHtml(navyHex)}" stroke="url(#medalGold)" stroke-width="1.5"/>
    <polygon points="84,88 100,144 80,132 68,146 62,92" fill="${escapeHtml(navyHex)}" stroke="url(#medalGold)" stroke-width="1.5"/>
    <!-- Scalloped Gold Outer Ring -->
    <circle cx="60" cy="54" r="44" fill="url(#medalGold)" stroke="#9B720C" stroke-width="1.5"/>
    <circle cx="60" cy="54" r="38" fill="${escapeHtml(navyHex)}" stroke="#F6E27A" stroke-width="1.8"/>
    <circle cx="60" cy="54" r="34" fill="none" stroke="${escapeHtml(goldHex)}" stroke-width="0.8" stroke-dasharray="2 2"/>
    <!-- Trophy -->
    <path d="M51 34 H69 V44 C69 50, 65 54, 60 54 C55 54, 51 50, 51 44 Z" fill="url(#medalGold)"/>
    <rect x="58" y="54" width="4" height="5" fill="url(#medalGold)"/>
    <rect x="53" y="59" width="14" height="3" rx="1" fill="url(#medalGold)"/>
    <!-- Stars -->
    <text x="60" y="69" text-anchor="middle" fill="#F6E27A" font-size="6.5" font-family="Arial, sans-serif">★★★★★</text>
    <!-- Banner Text -->
    <text x="60" y="79" text-anchor="middle" fill="#FFFFFF" font-size="7" font-weight="700" font-family="Montserrat, Arial, sans-serif" letter-spacing="0.6">CERTIFIED</text>
    <text x="60" y="87" text-anchor="middle" fill="#F6E27A" font-size="6.5" font-weight="700" font-family="Montserrat, Arial, sans-serif" letter-spacing="0.6">STUDENT</text>
  </svg>`;
}

function renderDefaultSealSvg(instituteName: string, navyHex: string): string {
  const shortName = escapeHtml(
    (instituteName || "CERTIDESK INSTITUTE").toUpperCase().slice(0, 28)
  );
  return `
  <svg viewBox="0 0 110 110" style="width:100%;height:100%;display:block;">
    <circle cx="55" cy="55" r="49" fill="none" stroke="${escapeHtml(navyHex)}" stroke-width="2.2"/>
    <circle cx="55" cy="55" r="44" fill="none" stroke="${escapeHtml(navyHex)}" stroke-width="0.9"/>
    <circle cx="55" cy="55" r="26" fill="none" stroke="${escapeHtml(navyHex)}" stroke-width="1"/>
    <path d="M40 50 L55 43 L70 50 L55 57 Z" fill="${escapeHtml(navyHex)}"/>
    <path d="M44 54 V62 C48 65, 62 65, 66 62 V54 L55 59 Z" fill="#1D4ED8"/>
    <text x="55" y="19.5" text-anchor="middle" fill="${escapeHtml(navyHex)}" font-size="4.6" font-weight="800" font-family="Montserrat, Arial, sans-serif">${shortName.slice(0, 18)}</text>
    <text x="55" y="94.5" text-anchor="middle" fill="${escapeHtml(navyHex)}" font-size="5.2" font-weight="700" font-family="Montserrat, Arial, sans-serif">VERIFIED SEAL</text>
  </svg>`;
}

function renderDefaultLogoSvg(navyHex: string, goldHex: string): string {
  return `
  <svg viewBox="0 0 80 64" style="width:100%;height:100%;display:block;">
    <path d="M12 24 L40 12 L68 24 L40 36 Z" fill="${escapeHtml(navyHex)}"/>
    <path d="M62 27 V40" stroke="${escapeHtml(goldHex)}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M12 40 C24 34, 34 38, 40 46 C46 38, 56 34, 68 40 V54 C56 48, 46 52, 40 58 C34 52, 24 48, 12 54 Z" fill="#1D4ED8" opacity="0.9"/>
  </svg>`;
}

function computeResponsiveFontPt(
  el: CertificateTemplateElement,
  resolvedText: string
): number {
  const base = el.fontSizePt;
  if (el.content.includes("{{student_name}}")) {
    if (resolvedText.length > 30) return Math.max(18, base * 0.68);
    if (resolvedText.length > 22) return Math.max(22, base * 0.82);
  }
  if (el.content.includes("{{course_full_name}}") && resolvedText.length > 52) {
    return Math.max(9.5, base * 0.85);
  }
  return base;
}

export function renderCertificateElementHtml(params: {
  el: CertificateTemplateElement;
  placeholders: CertificatePlaceholderValues;
  qrDataUrl: string;
  navyHex: string;
  goldHex: string;
}): string {
  const { el, placeholders, qrDataUrl, navyHex, goldHex } = params;
  if (el.visible === false) return "";

  const left = `${el.xMm}mm`;
  const top = `${el.yMm}mm`;
  const width = `${el.widthMm}mm`;
  const height = `${el.heightMm}mm`;
  const zIndex = el.zIndex ?? 5;
  const fontCss = mapFontFamilyCss(el.fontFamily);
  const resolved = resolveApprovedPlaceholders(el.content, placeholders);

  const baseBoxStyle = `position:absolute;left:${left};top:${top};width:${width};height:${height};z-index:${zIndex};box-sizing:border-box;`;

  if (el.type === "divider") {
    return `
    <div style="${baseBoxStyle}display:flex;align-items:center;justify-content:center;">
      <div style="flex:1;height:1.2px;background:linear-gradient(90deg, transparent, ${escapeHtml(el.colorHex)}, ${escapeHtml(el.colorHex)});"></div>
      <div style="width:6px;height:6px;transform:rotate(45deg);background:${escapeHtml(el.colorHex)};margin:0 6px;"></div>
      <div style="flex:1;height:1.2px;background:linear-gradient(90deg, ${escapeHtml(el.colorHex)}, ${escapeHtml(el.colorHex)}, transparent);"></div>
    </div>`;
  }

  if (el.type === "qr_code") {
    return `
    <div style="${baseBoxStyle}display:flex;flex-direction:column;align-items:center;justify-content:center;background:#FFFFFF;border:1.5px solid #1E293B;border-radius:6px;padding:1.5mm;">
      <img src="${qrDataUrl}" alt="Verification QR" style="width:100%;height:100%;object-fit:contain;display:block;" />
    </div>`;
  }

  if (el.type === "medal") {
    return `<div style="${baseBoxStyle}">${renderCertifiedMedalSvg(navyHex, goldHex)}</div>`;
  }

  if (el.type === "seal") {
    const imgUrl = resolved.trim();
    if (
      imgUrl &&
      (imgUrl.startsWith("http") || imgUrl.startsWith("data:") || imgUrl.startsWith("/"))
    ) {
      return `<div style="${baseBoxStyle}display:flex;align-items:center;justify-content:center;"><img src="${escapeHtml(imgUrl)}" alt="Institute Seal" style="max-width:100%;max-height:100%;object-fit:contain;" /></div>`;
    }
    return `<div style="${baseBoxStyle}">${renderDefaultSealSvg(placeholders.institute_name ?? "Institute", navyHex)}</div>`;
  }

  if (el.type === "image") {
    const imgUrl = resolved.trim();
    if (
      imgUrl &&
      (imgUrl.startsWith("http") || imgUrl.startsWith("data:") || imgUrl.startsWith("/"))
    ) {
      return `<div style="${baseBoxStyle}display:flex;align-items:center;justify-content:center;"><img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(el.label)}" style="max-width:100%;max-height:100%;object-fit:contain;" /></div>`;
    }
    if (el.content.includes("institute_logo")) {
      return `<div style="${baseBoxStyle}">${renderDefaultLogoSvg(navyHex, goldHex)}</div>`;
    }
    return `<div style="${baseBoxStyle}border-bottom:1px solid #334155;"></div>`;
  }

  if (el.type === "banner") {
    const bg = el.backgroundColorHex || navyHex;
    const border = el.borderColorHex || goldHex;
    return `
    <div style="${baseBoxStyle}display:flex;align-items:center;justify-content:center;">
      <div style="flex:1;height:1.5px;background:linear-gradient(90deg, transparent, ${escapeHtml(border)});margin-right:3mm;"></div>
      <div style="background:${escapeHtml(bg)};border:1.8px solid ${escapeHtml(border)};box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.22);border-radius:10px;padding:2.2mm 10mm;display:flex;align-items:center;justify-content:center;color:${escapeHtml(el.colorHex)};font-family:${fontCss};font-size:${el.fontSizePt}pt;font-weight:${el.fontWeight === "bold" ? 700 : 400};letter-spacing:0.6px;white-space:nowrap;">
        ${escapeHtml(resolved)}
      </div>
      <div style="flex:1;height:1.5px;background:linear-gradient(90deg, ${escapeHtml(border)}, transparent);margin-left:3mm;"></div>
    </div>`;
  }

  if (el.type === "ribbon") {
    const bg = el.backgroundColorHex || goldHex;
    const border = el.borderColorHex || "#B8860B";
    return `
    <div style="${baseBoxStyle}display:flex;align-items:center;justify-content:center;">
      <div style="background:linear-gradient(90deg, ${escapeHtml(border)}, ${escapeHtml(bg)}, ${escapeHtml(border)});color:${escapeHtml(el.colorHex)};font-family:${fontCss};font-size:${el.fontSizePt}pt;font-weight:${el.fontWeight === "bold" ? 700 : 500};font-style:${el.fontStyle ?? "normal"};padding:1.2mm 9mm;border-radius:4px;letter-spacing:0.4px;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.08);">
        ${escapeHtml(resolved)}
      </div>
    </div>`;
  }

  if (el.type === "pill") {
    const bg = el.backgroundColorHex || navyHex;
    return `
    <div style="${baseBoxStyle}display:flex;align-items:center;justify-content:${el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center"};">
      <div style="background:${escapeHtml(bg)};color:${escapeHtml(el.colorHex)};font-family:${fontCss};font-size:${el.fontSizePt}pt;font-weight:${el.fontWeight === "bold" ? 700 : 600};padding:1.2mm 6mm;border-radius:999px;white-space:nowrap;">
        ${escapeHtml(resolved)}
      </div>
    </div>`;
  }

  const effectiveFontPt = computeResponsiveFontPt(el, resolved);
  return `
  <div style="${baseBoxStyle}display:flex;align-items:center;justify-content:${el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center"};text-align:${el.align};color:${escapeHtml(el.colorHex)};font-family:${fontCss};font-size:${effectiveFontPt}pt;font-weight:${el.fontWeight === "bold" ? 700 : 400};font-style:${el.fontStyle ?? "normal"};line-height:1.28;overflow:hidden;word-break:break-word;">
    <span style="width:100%;">${escapeHtml(resolved)}</span>
  </div>`;
}

export function buildCertificateCanvasInnerHtml(params: {
  template: CertificateTemplateRecord;
  placeholders: CertificatePlaceholderValues;
  qrDataUrl: string;
}): string {
  const { template, placeholders, qrDataUrl } = params;
  const navyHex = template.secondaryColorHex || "#0C2340";
  const goldHex = template.accentColorHex || "#D4AF37";

  const guilloche = template.showGuillocheBg !== false ? renderSvgGuillocheBg() : "";
  const corners =
    template.showCornerDecorations !== false
      ? renderSvgCornerDecorations(navyHex, goldHex)
      : "";
  const doubleGoldBorder =
    template.showDoubleGoldBorder !== false
      ? `
    <div style="position:absolute;inset:8mm;border:2px solid ${escapeHtml(goldHex)};pointer-events:none;z-index:1;"></div>
    <div style="position:absolute;inset:10.5mm;border:0.9px solid ${escapeHtml(goldHex)};opacity:0.8;pointer-events:none;z-index:1;"></div>`
      : `
    <div style="position:absolute;inset:8mm;border:2px solid ${escapeHtml(template.borderColorHex)};pointer-events:none;z-index:1;"></div>`;

  const elementsHtml = template.elements
    .map((el) =>
      renderCertificateElementHtml({
        el,
        placeholders,
        qrDataUrl,
        navyHex,
        goldHex,
      })
    )
    .join("\n");

  return `
  <div class="certidesk-a4-canvas" style="position:relative;width:${template.widthMm}mm;height:${template.heightMm}mm;background:${escapeHtml(template.backgroundColorHex)};overflow:hidden;box-sizing:border-box;">
    ${guilloche}
    ${doubleGoldBorder}
    ${corners}
    ${elementsHtml}
  </div>`;
}

export function buildCertificateDocumentHtml(params: {
  template: CertificateTemplateRecord;
  placeholders: CertificatePlaceholderValues;
  qrDataUrl: string;
}): string {
  const inner = buildCertificateCanvasInnerHtml(params);
  const { widthMm, heightMm } = params.template;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${CERTIFICATE_GOOGLE_FONTS_CSS}" />
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  ${inner}
</body>
</html>`;
}
