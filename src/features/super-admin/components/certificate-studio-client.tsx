"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Lock,
  Maximize2,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Unlock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import {
  buildCertificateCanvasInnerHtml,
  CERTIFICATE_GOOGLE_FONTS_CSS,
} from "@/lib/pdf/certificate-html";
import { buildSbciNavyGoldTemplate } from "@/lib/pdf/certificate-presets";
import { validateCertificateBeforeExport } from "@/lib/pdf/certificate-validation";
import type { CertificatePlaceholderValues } from "@/lib/pdf/certificate-placeholders";
import type {
  CertificateElementType,
  CertificateTemplateElement,
  CertificateTemplateRecord,
  TemplateFontFamily,
} from "@/types/templates";

const SAMPLE_PLACEHOLDERS: CertificatePlaceholderValues = {
  institute_name: "SBCI COMPUTER INSTITUTE",
  institute_address:
    "Bhuvalpur Road, Main Chauraha, Akbarpur, Ambedkar Nagar - 224122 (U.P.)",
  registration_number: "SBCI/2026/001",
  issue_date: "28 Nov 2026",
  student_name: "Rahul Kumar",
  student_id: "STU-SBCI-001",
  course_name: "ADCA",
  course_full_name: "Advanced Diploma in Computer Applications",
  duration: "12 Months",
  marks: "425 / 500",
  percentage: "85",
  grade: "A+",
  result: "PASS",
  certificate_number: "CERT-SBCI-2026-0001",
  director_name: "Vinkal Prajapati",
};

const QUICK_PLACEHOLDERS = [
  "{{student_name}}",
  "{{course_name}}",
  "{{course_full_name}}",
  "{{institute_name}}",
  "{{institute_address}}",
  "{{registration_number}}",
  "{{issue_date}}",
  "{{percentage}}",
  "{{grade}}",
  "{{certificate_number}}",
  "{{director_name}}",
];

const FONT_OPTIONS: Array<{ label: string; value: TemplateFontFamily }> = [
  { label: "Cinzel Decorative", value: "Cinzel Decorative" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Great Vibes (Calligraphy)", value: "Great Vibes" },
  { label: "Allura (Calligraphy)", value: "Allura" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Libre Baskerville", value: "Libre Baskerville" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Times Roman", value: "TimesRoman" },
  { label: "Courier", value: "Courier" },
];

export function CertificateStudioClient({
  initialTemplate,
}: {
  initialTemplate: CertificateTemplateRecord;
}) {
  const router = useRouter();
  const [template, setTemplate] = React.useState(initialTemplate);
  const [history, setHistory] = React.useState<CertificateTemplateRecord[]>([
    initialTemplate,
  ]);
  const [historyIdx, setHistoryIdx] = React.useState(0);

  const [selectedId, setSelectedId] = React.useState(
    initialTemplate.elements[0]?.id ?? ""
  );
  const [previewMode, setPreviewMode] = React.useState<"sample" | "placeholders">(
    "sample"
  );
  const [fullPreviewOpen, setFullPreviewOpen] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = React.useState(0.72);
  const dragStateRef = React.useRef<{
    id: string;
    startX: number;
    startY: number;
    origXMm: number;
    origYMm: number;
  } | null>(null);

  // Load Google Fonts stylesheet in the editor so preview matches PDF 100%
  React.useEffect(() => {
    const linkId = "certidesk-studio-google-fonts";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = CERTIFICATE_GOOGLE_FONTS_CSS;
      document.head.appendChild(link);
    }
    QRCode.toDataURL("https://certidesk.sbci.online/verify/CERT_PREVIEW_SAMPLE", {
      width: 300,
      margin: 1,
    })
      .then(setQrDataUrl)
      .catch(() => undefined);
  }, []);

  // Measure container width to scale the exact 297mm (1122.5px) canvas cleanly
  React.useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const updateScale = () => {
      const w = el.clientWidth;
      if (w > 0) {
        // 297mm at 96dpi ≈ 1122.52px
        setCanvasScale(Math.min(1, w / 1122.52));
      }
    };
    updateScale();
    const obs = new ResizeObserver(updateScale);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const commitTemplate = React.useCallback(
    (updater: (prev: CertificateTemplateRecord) => CertificateTemplateRecord) => {
      setTemplate((prev) => {
        const next = updater(prev);
        setHistory((h) => [...h.slice(0, historyIdx + 1), next].slice(-25));
        setHistoryIdx((idx) => Math.min(24, idx + 1));
        return next;
      });
    },
    [historyIdx]
  );

  const handleUndo = () => {
    if (historyIdx <= 0) return;
    const nextIdx = historyIdx - 1;
    setHistoryIdx(nextIdx);
    setTemplate(history[nextIdx]!);
  };

  const handleRedo = () => {
    if (historyIdx >= history.length - 1) return;
    const nextIdx = historyIdx + 1;
    setHistoryIdx(nextIdx);
    setTemplate(history[nextIdx]!);
  };

  const selectedEl = template.elements.find((e) => e.id === selectedId);

  const updateElement = (id: string, patch: Partial<CertificateTemplateElement>) => {
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    }));
  };

  const addElement = (type: CertificateElementType) => {
    const id = `el_${Date.now()}`;
    const newEl: CertificateTemplateElement = {
      id,
      type,
      label:
        type === "qr_code"
          ? "QR Code"
          : type === "divider"
            ? "Gold Divider"
            : type === "pill"
              ? "Badge Pill"
              : "New Element",
      content:
        type === "placeholder"
          ? "{{student_name}}"
          : type === "qr_code"
            ? "QR"
            : type === "divider"
              ? "divider"
              : "Custom Text",
      xMm: 60,
      yMm: 95,
      widthMm: type === "qr_code" ? 28 : 140,
      heightMm: type === "qr_code" ? 28 : type === "divider" ? 3 : 10,
      fontFamily: "Montserrat",
      fontSizePt: 12,
      fontWeight: "bold",
      colorHex: "#0C2340",
      align: "center",
      zIndex: 8,
    };
    commitTemplate((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedId(id);
  };

  const duplicateSelected = () => {
    if (!selectedEl) return;
    const id = `el_${Date.now()}`;
    const copy: CertificateTemplateElement = {
      ...selectedEl,
      id,
      label: `${selectedEl.label} (Copy)`,
      xMm: Math.min(template.widthMm - selectedEl.widthMm, selectedEl.xMm + 6),
      yMm: Math.min(template.heightMm - selectedEl.heightMm, selectedEl.yMm + 6),
      locked: false,
    };
    commitTemplate((prev) => ({ ...prev, elements: [...prev.elements, copy] }));
    setSelectedId(id);
  };

  const moveLayer = (direction: "up" | "down") => {
    if (!selectedEl) return;
    const currentZ = selectedEl.zIndex ?? 6;
    updateElement(selectedEl.id, {
      zIndex: direction === "up" ? currentZ + 1 : Math.max(1, currentZ - 1),
    });
  };

  // Drag-and-drop pointer handlers
  const handlePointerDown = (e: React.PointerEvent, el: CertificateTemplateElement) => {
    e.stopPropagation();
    setSelectedId(el.id);
    if (el.locked) return;
    dragStateRef.current = {
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origXMm: el.xMm,
      origYMm: el.yMm,
    };
  };

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const pxToMm = 297 / (1122.52 * canvasScale);
      const dxMm = (e.clientX - drag.startX) * pxToMm;
      const dyMm = (e.clientY - drag.startY) * pxToMm;
      setTemplate((prev) => ({
        ...prev,
        elements: prev.elements.map((item) => {
          if (item.id !== drag.id) return item;
          const nextX = Math.max(
            0,
            Math.min(
              prev.widthMm - item.widthMm,
              Number((drag.origXMm + dxMm).toFixed(1))
            )
          );
          const nextY = Math.max(
            0,
            Math.min(
              prev.heightMm - item.heightMm,
              Number((drag.origYMm + dyMm).toFixed(1))
            )
          );
          return { ...item, xMm: nextX, yMm: nextY };
        }),
      }));
    };
    const onUp = () => {
      dragStateRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [canvasScale]);

  const activePlaceholders: CertificatePlaceholderValues = React.useMemo(
    () =>
      previewMode === "sample"
        ? SAMPLE_PLACEHOLDERS
        : {
            institute_name: "{{institute_name}}",
            institute_address: "{{institute_address}}",
            registration_number: "{{registration_number}}",
            issue_date: "{{issue_date}}",
            student_name: "{{student_name}}",
            student_id: "{{student_id}}",
            course_name: "{{course_name}}",
            course_full_name: "{{course_full_name}}",
            percentage: "{{percentage}}",
            grade: "{{grade}}",
            certificate_number: "{{certificate_number}}",
            director_name: "{{director_name}}",
          },
    [previewMode]
  );

  const validation = React.useMemo(
    () =>
      validateCertificateBeforeExport({
        template,
        placeholders: SAMPLE_PLACEHOLDERS,
        verifyUrl: "https://certidesk.sbci.online/verify/CERT_PREVIEW_SAMPLE",
      }),
    [template]
  );

  const previewInnerHtml = React.useMemo(
    () =>
      buildCertificateCanvasInnerHtml({
        template,
        placeholders: activePlaceholders,
        qrDataUrl,
      }),
    [activePlaceholders, qrDataUrl, template]
  );

  const saveTemplate = async (status: "draft" | "published", asNewCopy = false) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = asNewCopy
        ? {
            ...template,
            id: undefined,
            name: `${template.name} (Copy)`,
            status: "draft" as const,
          }
        : { ...template, status };

      const res = await fetch("/api/su/templates/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { template: CertificateTemplateRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to save template.");
        return;
      }
      setTemplate(json.data.template);
      setMessage(
        asNewCopy
          ? `Duplicated template "${json.data.template.name}".`
          : `Saved ${json.data.template.status} v${json.data.template.version}.`
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSamplePdf = async () => {
    if (!validation.valid) {
      setError(validation.errors.join(" "));
      return;
    }
    setDownloadingPdf(true);
    setError(null);
    try {
      const res = await fetch("/api/su/templates/certificates/preview-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, placeholders: SAMPLE_PLACEHOLDERS }),
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(errJson?.error?.message ?? "PDF generation failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SBCI_ADCA_Rahul_Kumar_Certificate.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-foreground text-xl font-bold">{template.name}</h2>
          <Badge variant={template.status === "published" ? "success" : "outline"}>
            {template.status} v{template.version}
          </Badge>
          <Badge variant="primary">A4 Landscape (297×210mm)</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={historyIdx <= 0}
            onClick={handleUndo}
            title="Undo"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={historyIdx >= history.length - 1}
            onClick={handleRedo}
            title="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => {
              const preset = buildSbciNavyGoldTemplate();
              commitTemplate((prev) => ({
                ...preset,
                id: prev.id,
                version: prev.version,
              }));
              setMessage("Loaded SBCI Navy & Gold A4 Landscape preset.");
            }}
          >
            SBCI Preset
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() =>
              setPreviewMode((m) => (m === "sample" ? "placeholders" : "sample"))
            }
          >
            {previewMode === "sample" ? "Show Keys" : "Sample Data"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => setFullPreviewOpen(true)}
          >
            Full Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={downloadingPdf}
            leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => void handleDownloadSamplePdf()}
          >
            Download PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={saving}
            onClick={() => void saveTemplate("draft", true)}
          >
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={saving}
            leftIcon={<Save className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => void saveTemplate("draft")}
          >
            Save Draft
          </Button>
          <Button
            size="sm"
            loading={saving}
            onClick={() => void saveTemplate("published")}
          >
            Publish
          </Button>
        </div>
      </div>

      {error ? (
        <div className="bg-danger-soft text-danger flex items-center gap-2 rounded-lg border border-red-200 p-3 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
      {message ? (
        <div className="bg-success-soft text-success flex items-center gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Live Pixel-Perfect Canvas */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">
              Live A4 Landscape Preview (Drag any unlocked element)
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus className="h-3 w-3" aria-hidden="true" />}
                onClick={() => addElement("placeholder")}
              >
                Placeholder
              </Button>
              <Button size="sm" variant="outline" onClick={() => addElement("text")}>
                + Text
              </Button>
              <Button size="sm" variant="outline" onClick={() => addElement("divider")}>
                + Divider
              </Button>
              <Button size="sm" variant="outline" onClick={() => addElement("qr_code")}>
                + QR
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={canvasContainerRef}
              className="border-border bg-surface/60 relative w-full overflow-hidden rounded-xl border p-2"
            >
              <div
                style={{
                  width: `${1122.52 * canvasScale}px`,
                  height: `${793.7 * canvasScale}px`,
                  position: "relative",
                  margin: "0 auto",
                }}
              >
                <div
                  style={{
                    width: "297mm",
                    height: "210mm",
                    transform: `scale(${canvasScale})`,
                    transformOrigin: "top left",
                    position: "relative",
                    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: previewInnerHtml }} />

                  {/* Interactive Selection & Drag Handles */}
                  {template.elements.map((el) => {
                    if (el.visible === false) return null;
                    const isSel = el.id === selectedId;
                    return (
                      <div
                        key={el.id}
                        role="button"
                        tabIndex={0}
                        onPointerDown={(e) => handlePointerDown(e, el)}
                        onClick={() => setSelectedId(el.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSelectedId(el.id);
                        }}
                        style={{
                          position: "absolute",
                          left: `${el.xMm}mm`,
                          top: `${el.yMm}mm`,
                          width: `${el.widthMm}mm`,
                          height: `${el.heightMm}mm`,
                          zIndex: (el.zIndex ?? 5) + 20,
                          cursor: el.locked ? "pointer" : "move",
                        }}
                        className={`transition-shadow ${
                          isSel
                            ? "bg-blue-500/5 ring-2 ring-blue-600 ring-offset-1"
                            : "hover:ring-1 hover:ring-blue-400/70"
                        }`}
                        title={`${el.label} (${el.xMm}mm, ${el.yMm}mm)`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pre-Export Validation Summary */}
            <div className="border-border bg-surface/50 mt-3 rounded-xl border p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Pre-Export PDF Validation</span>
                <Badge variant={validation.valid ? "success" : "danger"}>
                  {validation.valid ? "Ready for A4 PDF Export" : "Issues Found"}
                </Badge>
              </div>
              {validation.errors.map((err) => (
                <p key={err} className="text-danger mt-1 text-[11px]">
                  • {err}
                </p>
              ))}
              {validation.warnings.map((w) => (
                <p key={w} className="text-warning mt-1 text-[11px]">
                  • {w}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inspector Panel */}
        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Template &amp; Border Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Input
                label="Template Name"
                value={template.name}
                onChange={(e) =>
                  setTemplate((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Background"
                  type="color"
                  value={template.backgroundColorHex}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      backgroundColorHex: e.target.value,
                    }))
                  }
                />
                <Input
                  label="Navy Accent"
                  type="color"
                  value={template.secondaryColorHex || "#0C2340"}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      secondaryColorHex: e.target.value,
                    }))
                  }
                />
                <Input
                  label="Gold Border"
                  type="color"
                  value={template.accentColorHex || template.borderColorHex}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      accentColorHex: e.target.value,
                      borderColorHex: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={template.showDoubleGoldBorder !== false}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        showDoubleGoldBorder: e.target.checked,
                      }))
                    }
                  />
                  Double Gold Border
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={template.showCornerDecorations !== false}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        showCornerDecorations: e.target.checked,
                      }))
                    }
                  />
                  Corner Ribbons
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={template.showGuillocheBg !== false}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        showGuillocheBg: e.target.checked,
                      }))
                    }
                  />
                  Guilloche Waves
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">Element Inspector</CardTitle>
              {selectedEl ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    title={selectedEl.locked ? "Unlock" : "Lock"}
                    onClick={() =>
                      updateElement(selectedEl.id, { locked: !selectedEl.locked })
                    }
                  >
                    {selectedEl.locked ? (
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Bring Forward"
                    onClick={() => moveLayer("up")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Send Backward"
                    onClick={() => moveLayer("down")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Duplicate Element"
                    onClick={duplicateSelected}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {selectedEl ? (
                <>
                  <Input
                    label="Element Label"
                    value={selectedEl.label}
                    onChange={(e) =>
                      updateElement(selectedEl.id, { label: e.target.value })
                    }
                  />
                  <Input
                    label="Content / Placeholder"
                    value={selectedEl.content}
                    onChange={(e) =>
                      updateElement(selectedEl.id, { content: e.target.value })
                    }
                  />
                  <div className="flex flex-wrap gap-1">
                    {QUICK_PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() =>
                          updateElement(selectedEl.id, {
                            content: `${selectedEl.content} ${ph}`.trim(),
                          })
                        }
                        className="border-border bg-surface hover:bg-primary-soft cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[10px]"
                      >
                        {ph}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="X (mm)"
                      type="number"
                      step="0.5"
                      value={String(selectedEl.xMm)}
                      onChange={(e) =>
                        updateElement(selectedEl.id, { xMm: Number(e.target.value) })
                      }
                    />
                    <Input
                      label="Y (mm)"
                      type="number"
                      step="0.5"
                      value={String(selectedEl.yMm)}
                      onChange={(e) =>
                        updateElement(selectedEl.id, { yMm: Number(e.target.value) })
                      }
                    />
                    <Input
                      label="Width (mm)"
                      type="number"
                      step="0.5"
                      value={String(selectedEl.widthMm)}
                      onChange={(e) =>
                        updateElement(selectedEl.id, {
                          widthMm: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="Height (mm)"
                      type="number"
                      step="0.5"
                      value={String(selectedEl.heightMm)}
                      onChange={(e) =>
                        updateElement(selectedEl.id, {
                          heightMm: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Font Family"
                      value={selectedEl.fontFamily}
                      onChange={(e) =>
                        updateElement(selectedEl.id, {
                          fontFamily: e.target.value as TemplateFontFamily,
                        })
                      }
                      options={FONT_OPTIONS}
                    />
                    <Input
                      label="Font Size (pt)"
                      type="number"
                      step="0.5"
                      value={String(selectedEl.fontSizePt)}
                      onChange={(e) =>
                        updateElement(selectedEl.id, {
                          fontSizePt: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      label="Weight"
                      value={selectedEl.fontWeight}
                      onChange={(e) =>
                        updateElement(selectedEl.id, {
                          fontWeight: e.target.value as "normal" | "bold",
                        })
                      }
                      options={[
                        { label: "Normal", value: "normal" },
                        { label: "Bold", value: "bold" },
                      ]}
                    />
                    <Select
                      label="Align"
                      value={selectedEl.align}
                      onChange={(e) =>
                        updateElement(selectedEl.id, {
                          align: e.target.value as "left" | "center" | "right",
                        })
                      }
                      options={[
                        { label: "Left", value: "left" },
                        { label: "Center", value: "center" },
                        { label: "Right", value: "right" },
                      ]}
                    />
                    <Input
                      label="Text Color"
                      type="color"
                      value={selectedEl.colorHex}
                      onChange={(e) =>
                        updateElement(selectedEl.id, { colorHex: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    fullWidth
                    leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() =>
                      commitTemplate((prev) => ({
                        ...prev,
                        elements: prev.elements.filter((el) => el.id !== selectedEl.id),
                      }))
                    }
                  >
                    Remove Element
                  </Button>
                </>
              ) : (
                <p className="text-muted text-xs">
                  Click any element on the canvas to edit or drag it.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-Size A4 Preview Modal */}
      <ResponsiveFormModal
        open={fullPreviewOpen}
        onClose={() => setFullPreviewOpen(false)}
        title="Full-Size A4 Landscape Preview"
        subtitle="297mm × 210mm — Exact match to exported PDF"
      >
        <div className="max-h-[75vh] overflow-auto rounded-lg border bg-slate-100 p-4 dark:bg-slate-900">
          <div
            style={{ width: "297mm", height: "210mm", margin: "0 auto" }}
            dangerouslySetInnerHTML={{ __html: previewInnerHtml }}
          />
        </div>
      </ResponsiveFormModal>
    </div>
  );
}
