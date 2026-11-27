export type TemplateFontFamily = "Helvetica" | "TimesRoman" | "Courier";

export interface CertificateTemplateElement {
  id: string;
  type: "text" | "placeholder" | "qr_code" | "divider";
  label: string;
  content: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontFamily: TemplateFontFamily;
  fontSizePt: number;
  fontWeight: "normal" | "bold";
  colorHex: string;
  align: "left" | "center" | "right";
  locked?: boolean;
}

export interface CertificateTemplateRecord {
  id: string;
  name: string;
  orientation: "landscape" | "portrait";
  widthMm: number;
  heightMm: number;
  backgroundColorHex: string;
  borderColorHex: string;
  watermarkText: string;
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
