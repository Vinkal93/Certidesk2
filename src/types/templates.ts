export type TemplateFontFamily =
  | "Cinzel Decorative"
  | "Cormorant Garamond"
  | "Great Vibes"
  | "Allura"
  | "Montserrat"
  | "Libre Baskerville"
  | "Helvetica"
  | "TimesRoman"
  | "Courier";

export type CertificateElementType =
  | "text"
  | "placeholder"
  | "qr_code"
  | "divider"
  | "image"
  | "pill"
  | "banner"
  | "ribbon"
  | "medal"
  | "seal";

export interface CertificateTemplateElement {
  id: string;
  type: CertificateElementType;
  label: string;
  content: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontFamily: TemplateFontFamily;
  fontSizePt: number;
  fontWeight: "normal" | "bold";
  fontStyle?: "normal" | "italic" | undefined;
  colorHex: string;
  backgroundColorHex?: string | undefined;
  borderColorHex?: string | undefined;
  align: "left" | "center" | "right";
  zIndex?: number | undefined;
  locked?: boolean | undefined;
  visible?: boolean | undefined;
}

export type CertificatePresetKey =
  | "sbci_navy_gold"
  | "imperial_burgundy"
  | "emerald_luxury"
  | "corporate_slate"
  | "obsidian_gold"
  | "classic_academic"
  | "modern_minimal"
  | "custom";

export interface CertificateTemplateRecord {
  id: string;
  name: string;
  presetKey?: CertificatePresetKey | undefined;
  orientation: "landscape" | "portrait";
  widthMm: number;
  heightMm: number;
  backgroundColorHex: string;
  borderColorHex: string;
  accentColorHex?: string | undefined;
  secondaryColorHex?: string | undefined;
  showDoubleGoldBorder?: boolean | undefined;
  showCornerDecorations?: boolean | undefined;
  showGuillocheBg?: boolean | undefined;
  watermarkText: string;
  watermarkOpacity?: number | undefined;
  elements: CertificateTemplateElement[];
  status: "draft" | "published" | "archived";
  version: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarksheetColumnConfig {
  key: string;
  label: string;
  widthPercent: number;
  align: "left" | "center" | "right";
}

export interface MarksheetTemplateRecord {
  id: string;
  name: string;
  orientation: "portrait" | "landscape";
  headerTitle: string;
  footerNote: string;
  watermarkText: string;
  columns: MarksheetColumnConfig[];
  status: "draft" | "published" | "archived";
  version: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
