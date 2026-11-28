"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileDown,
  GraduationCap,
  Grid,
  Lock,
  Maximize2,
  Palette,
  Plus,
  Printer,
  Redo2,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Undo2,
  Unlock,
  Upload,
  ZoomIn,
  ZoomOut,
  Layers,
  Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import {
  buildCertificateCanvasInnerHtml,
  buildCertificateDocumentHtml,
  CERTIFICATE_GOOGLE_FONTS_CSS,
} from "@/lib/pdf/certificate-html";
import {
  CERTIFICATE_PRESETS_CATALOG,
  buildSbciNavyGoldTemplate,
  type PresetCatalogItem,
} from "@/lib/pdf/certificate-presets";
import {
  CERTIFICATE_SAMPLE_PROFILES,
  CATEGORIZED_PLACEHOLDERS,
  type CertificatePlaceholderValues,
  type SampleProfileItem,
} from "@/lib/pdf/certificate-placeholders";
import { validateCertificateBeforeExport } from "@/lib/pdf/certificate-validation";
import type {
  CertificateElementType,
  CertificateTemplateElement,
  CertificateTemplateRecord,
  TemplateFontFamily,
} from "@/types/templates";

const FONT_OPTIONS: Array<{ label: string; value: TemplateFontFamily }> = [
  { label: "Cinzel Decorative (Heading / Regal)", value: "Cinzel Decorative" },
  { label: "Cormorant Garamond (Academic Serif)", value: "Cormorant Garamond" },
  { label: "Great Vibes (Calligraphy Script)", value: "Great Vibes" },
  { label: "Allura (Flowing Calligraphy)", value: "Allura" },
  { label: "Montserrat (Clean Modern Sans)", value: "Montserrat" },
  { label: "Libre Baskerville (Classic Book Serif)", value: "Libre Baskerville" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Times Roman", value: "TimesRoman" },
  { label: "Courier (Monospace)", value: "Courier" },
];

type StudioTab = "inspector" | "layers" | "design" | "placeholders";

export function CertificateStudioClient({
  initialTemplate,
}: {
  initialTemplate: CertificateTemplateRecord;
}) {
  const router = useRouter();
  const [template, setTemplate] = React.useState<CertificateTemplateRecord>(initialTemplate);
  const [history, setHistory] = React.useState<CertificateTemplateRecord[]>([initialTemplate]);
  const [historyIdx, setHistoryIdx] = React.useState(0);

  const [selectedId, setSelectedId] = React.useState<string>(
    initialTemplate.elements[0]?.id ?? ""
  );

  // Active persona for preview
  const [activeProfileId, setActiveProfileId] = React.useState<string>("profile_rahul");
  const [previewMode, setPreviewMode] = React.useState<"sample" | "placeholders">("sample");

  // Canvas Viewport & Designer Helpers
  const [zoomMode, setZoomMode] = React.useState<"fit" | number>("fit");
  const [containerWidth, setContainerWidth] = React.useState<number>(1000);
  const [showGrid, setShowGrid] = React.useState(false);
  const [showCenterGuides, setShowCenterGuides] = React.useState(false);

  // Active right sidebar tab
  const [activeTab, setActiveTab] = React.useState<StudioTab>("inspector");

  // Modals
  const [presetModalOpen, setPresetModalOpen] = React.useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState("");

  // Async States
  const [saving, setSaving] = React.useState(false);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const dragStateRef = React.useRef<{
    id: string;
    startX: number;
    startY: number;
    origXMm: number;
    origYMm: number;
  } | null>(null);

  // Load Google Fonts stylesheet in the editor so canvas preview matches PDF 100%
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
      width: 320,
      margin: 1,
    })
      .then(setQrDataUrl)
      .catch(() => undefined);
  }, []);

  // Measure container width to auto-scale the exact 297mm (1122.52px) canvas cleanly
  React.useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setContainerWidth(w);
      }
    };
    updateSize();
    const obs = new ResizeObserver(updateSize);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fitScale = React.useMemo(() => {
    // 297mm at 96dpi ≈ 1122.52px + 24px padding margin
    const availableW = Math.max(300, containerWidth - 28);
    return Math.min(1, Math.max(0.3, availableW / 1122.52));
  }, [containerWidth]);

  const effectiveScale = typeof zoomMode === "number" ? zoomMode : fitScale;

  const commitTemplate = React.useCallback(
    (updater: (prev: CertificateTemplateRecord) => CertificateTemplateRecord) => {
      setTemplate((prev) => {
        const next = updater(prev);
        setHistory((h) => [...h.slice(0, historyIdx + 1), next].slice(-30));
        setHistoryIdx((idx) => Math.min(29, idx + 1));
        return next;
      });
    },
    [historyIdx]
  );

  const handleUndo = React.useCallback(() => {
    if (historyIdx <= 0) return;
    const nextIdx = historyIdx - 1;
    setHistoryIdx(nextIdx);
    setTemplate(history[nextIdx]!);
  }, [historyIdx, history]);

  const handleRedo = React.useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const nextIdx = historyIdx + 1;
    setHistoryIdx(nextIdx);
    setTemplate(history[nextIdx]!);
  }, [historyIdx, history]);

  const selectedEl = template.elements.find((e) => e.id === selectedId);

  const updateElement = (id: string, patch: Partial<CertificateTemplateElement>) => {
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    }));
  };

  const addElement = (type: CertificateElementType, presetContent?: string, label?: string) => {
    const id = `el_${Date.now()}`;
    const newEl: CertificateTemplateElement = {
      id,
      type,
      label:
        label ??
        (type === "qr_code"
          ? "QR Code"
          : type === "divider"
            ? "Gold Divider"
            : type === "pill"
              ? "Status Pill"
              : type === "medal"
                ? "Certified Medal"
                : type === "seal"
                  ? "Institute Seal"
                  : type === "banner"
                    ? "Header Banner"
                    : type === "ribbon"
                      ? "Ribbon Accent"
                      : "New Element"),
      content:
        presetContent ??
        (type === "placeholder"
          ? "{{student_name}}"
          : type === "qr_code"
            ? "QR"
            : type === "divider"
              ? "divider"
              : type === "medal"
                ? "CERTIFIED"
                : type === "seal"
                  ? "{{institute_seal}}"
                  : "Custom Text"),
      xMm: 60,
      yMm: 95,
      widthMm:
        type === "qr_code" || type === "seal"
          ? 28
          : type === "medal"
            ? 36
            : type === "divider"
              ? 160
              : 140,
      heightMm:
        type === "qr_code" || type === "seal"
          ? 28
          : type === "medal"
            ? 46
            : type === "divider"
              ? 3
              : 10,
      fontFamily: "Montserrat",
      fontSizePt: type === "divider" ? 8 : 12,
      fontWeight: "bold",
      colorHex: template.secondaryColorHex || "#0C2340",
      backgroundColorHex:
        type === "pill" || type === "banner"
          ? template.secondaryColorHex || "#0C2340"
          : undefined,
      borderColorHex: template.accentColorHex || "#D4AF37",
      align: "center",
      zIndex: 8,
      visible: true,
      locked: false,
    };
    commitTemplate((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedId(id);
    setActiveTab("inspector");
  };

  const duplicateSelected = React.useCallback(() => {
    if (!selectedEl) return;
    const id = `el_${Date.now()}`;
    const copy: CertificateTemplateElement = {
      ...selectedEl,
      id,
      label: `${selectedEl.label} (Copy)`,
      xMm: Math.min(template.widthMm - selectedEl.widthMm, selectedEl.xMm + 5),
      yMm: Math.min(template.heightMm - selectedEl.heightMm, selectedEl.yMm + 5),
      locked: false,
    };
    commitTemplate((prev) => ({ ...prev, elements: [...prev.elements, copy] }));
    setSelectedId(id);
  }, [commitTemplate, selectedEl, template.heightMm, template.widthMm]);

  const moveLayer = (direction: "up" | "down" | "top" | "bottom") => {
    if (!selectedEl) return;
    const currentZ = selectedEl.zIndex ?? 6;
    let nextZ = currentZ;
    if (direction === "up") nextZ = currentZ + 1;
    if (direction === "down") nextZ = Math.max(1, currentZ - 1);
    if (direction === "top") nextZ = Math.max(...template.elements.map((e) => e.zIndex ?? 6)) + 1;
    if (direction === "bottom") nextZ = Math.min(...template.elements.map((e) => e.zIndex ?? 6)) - 1;
    updateElement(selectedEl.id, { zIndex: Math.max(1, nextZ) });
  };

  // Keyboard navigation & Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Escape") {
        setSelectedId("");
        return;
      }

      if (!selectedId) return;
      const step = e.shiftKey ? 2.0 : 0.5;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setTemplate((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === selectedId
              ? { ...el, xMm: Math.max(0, Number((el.xMm - step).toFixed(1))) }
              : el
          ),
        }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setTemplate((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === selectedId
              ? {
                  ...el,
                  xMm: Math.min(
                    prev.widthMm - el.widthMm,
                    Number((el.xMm + step).toFixed(1))
                  ),
                }
              : el
          ),
        }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setTemplate((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === selectedId
              ? { ...el, yMm: Math.max(0, Number((el.yMm - step).toFixed(1))) }
              : el
          ),
        }));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setTemplate((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === selectedId
              ? {
                  ...el,
                  yMm: Math.min(
                    prev.heightMm - el.heightMm,
                    Number((el.yMm + step).toFixed(1))
                  ),
                }
              : el
          ),
        }));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        commitTemplate((prev) => ({
          ...prev,
          elements: prev.elements.filter((el) => el.id !== selectedId),
        }));
        setSelectedId("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, handleRedo, handleUndo, duplicateSelected, commitTemplate]);

  // Drag-and-drop pointer handlers
  const handlePointerDown = (e: React.PointerEvent, el: CertificateTemplateElement) => {
    e.stopPropagation();
    setSelectedId(el.id);
    setActiveTab("inspector");
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
      const pxToMm = 297 / (1122.52 * effectiveScale);
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
  }, [effectiveScale]);

  // Current active sample data
  const currentProfile = React.useMemo<SampleProfileItem>(() => {
    return (
      CERTIFICATE_SAMPLE_PROFILES.find((p) => p.id === activeProfileId) ??
      CERTIFICATE_SAMPLE_PROFILES[0]!
    );
  }, [activeProfileId]);

  const activePlaceholders: CertificatePlaceholderValues = React.useMemo(() => {
    if (previewMode === "placeholders") {
      return {
        institute_name: "{{institute_name}}",
        institute_address: "{{institute_address}}",
        registration_number: "{{registration_number}}",
        issue_date: "{{issue_date}}",
        student_name: "{{student_name}}",
        student_id: "{{student_id}}",
        course_name: "{{course_name}}",
        course_full_name: "{{course_full_name}}",
        duration: "{{duration}}",
        marks: "{{marks}}",
        percentage: "{{percentage}}",
        grade: "{{grade}}",
        grade_text: "{{grade_text}}",
        result: "{{result}}",
        certificate_number: "{{certificate_number}}",
        director_name: "{{director_name}}",
      };
    }
    return currentProfile.values;
  }, [previewMode, currentProfile]);

  const validation = React.useMemo(
    () =>
      validateCertificateBeforeExport({
        template,
        placeholders: activePlaceholders,
        verifyUrl: "https://certidesk.sbci.online/verify/CERT_PREVIEW_SAMPLE",
      }),
    [activePlaceholders, template]
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
        body: JSON.stringify({ template, placeholders: activePlaceholders }),
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
      a.download = `${template.name.replace(/[^a-zA-Z0-9_-]+/g, "_")}_Preview.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Direct Browser High-Res Print
  const handleDirectPrint = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=850");
    if (!printWindow) {
      setError("Pop-up was blocked. Please allow pop-ups to open the print dialog.");
      return;
    }
    const html = buildCertificateDocumentHtml({
      template,
      placeholders: activePlaceholders,
      qrDataUrl,
    });
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 600);
  };

  // JSON Template Export
  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(template, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    const safeName = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    dlAnchor.setAttribute("download", `${safeName}_template.json`);
    dlAnchor.click();
    setMessage("Exported template JSON file.");
  };

  // JSON Template Import
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.elements || !Array.isArray(parsed.elements)) {
          setError("Invalid certificate template JSON file.");
          return;
        }
        commitTemplate((prev) => ({
          ...parsed,
          id: prev.id,
          version: prev.version,
        }));
        setMessage(`Imported template "${parsed.name || "Custom Template"}".`);
      } catch {
        setError("Failed to parse JSON template file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleApplyPreset = (preset: PresetCatalogItem) => {
    const fresh = preset.builder();
    commitTemplate((prev) => ({
      ...fresh,
      id: prev.id,
      version: prev.version,
    }));
    setPresetModalOpen(false);
    setMessage(`Loaded "${preset.name}" preset.`);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Action Command Bar */}
      <div className="border-border bg-card/70 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg font-bold">
              🎓
            </span>
            <div>
              <h2 className="text-foreground text-lg font-bold leading-tight">{template.name}</h2>
              <div className="flex items-center gap-1.5 pt-0.5">
                <Badge variant={template.status === "published" ? "success" : "outline"} size="sm">
                  {template.status.toUpperCase()} v{template.version}
                </Badge>
                <Badge variant="primary" size="sm">
                  A4 Landscape (297×210mm)
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* History Controls */}
          <div className="bg-surface border-border flex items-center rounded-lg border p-0.5">
            <Button
              size="sm"
              variant="ghost"
              disabled={historyIdx <= 0}
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
              className="h-8 w-8 p-0"
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={historyIdx >= history.length - 1}
              onClick={handleRedo}
              title="Redo (Ctrl+Y)"
              className="h-8 w-8 p-0"
            >
              <Redo2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Preset Selector */}
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />}
            onClick={() => setPresetModalOpen(true)}
          >
            Design Presets
          </Button>

          {/* Test Profile Persona Switcher */}
          <div className="hidden sm:block">
            <Select
              size="sm"
              value={activeProfileId}
              onChange={(e) => setActiveProfileId(e.target.value)}
              options={CERTIFICATE_SAMPLE_PROFILES.map((p) => ({
                label: `Test: ${p.name}`,
                value: p.id,
              }))}
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() =>
              setPreviewMode((m) => (m === "sample" ? "placeholders" : "sample"))
            }
          >
            {previewMode === "sample" ? "Raw Keys" : "Sample Data"}
          </Button>

          {/* Direct Print Button */}
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Printer className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={handleDirectPrint}
            title="Direct Browser Print (A4 Landscape)"
          >
            Print
          </Button>

          {/* Download Chromium PDF */}
          <Button
            size="sm"
            variant="outline"
            loading={downloadingPdf}
            leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => void handleDownloadSamplePdf()}
          >
            Export PDF
          </Button>

          {/* Save / Publish */}
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

      {/* Notifications */}
      {error ? (
        <div className="bg-danger-soft text-danger flex items-center justify-between gap-2 rounded-xl border border-red-200 p-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="hover:text-foreground text-xs font-semibold"
          >
            ✕
          </button>
        </div>
      ) : null}
      {message ? (
        <div className="bg-success-soft text-success flex items-center justify-between gap-2 rounded-xl border border-emerald-200 p-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="hover:text-foreground text-xs font-semibold"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Canvas Column (Cols 8) */}
        <div className="space-y-3 lg:col-span-8">
          {/* Canvas Sub-Toolbar: Quick Add + Zoom + Overlays */}
          <Card className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Quick Add Elements Palette */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                  Add:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  leftIcon={<Plus className="h-3 w-3" />}
                  onClick={() => addElement("placeholder")}
                >
                  Variable
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => addElement("text")}
                >
                  + Text
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => addElement("divider")}
                >
                  + Divider
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => addElement("qr_code")}
                >
                  + QR
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => addElement("medal")}
                >
                  + Medal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => addElement("seal")}
                >
                  + Seal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    addElement(
                      "image",
                      "{{student_photo}}",
                      "Student Photo"
                    )
                  }
                >
                  + Photo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => addElement("banner")}
                >
                  + Banner
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => addElement("pill")}
                >
                  + Pill
                </Button>
              </div>

              {/* Viewport Zoom & Guidelines Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={showGrid ? "primary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  title="Toggle 10mm Grid Overlay"
                  onClick={() => setShowGrid((g) => !g)}
                >
                  <Grid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={showCenterGuides ? "primary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  title="Toggle Center Alignment Guides"
                  onClick={() => setShowCenterGuides((c) => !c)}
                >
                  + Crosshair
                </Button>

                <div className="bg-surface border-border flex items-center rounded-lg border p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setZoomMode((curr) =>
                        typeof curr === "number"
                          ? Math.max(0.4, Number((curr - 0.1).toFixed(1)))
                          : Math.max(0.4, Number((fitScale - 0.1).toFixed(1)))
                      )
                    }
                    className="hover:bg-primary-soft rounded p-1 text-slate-600 dark:text-slate-300"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode("fit")}
                    className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      zoomMode === "fit" ? "bg-primary text-primary-foreground" : "text-muted"
                    }`}
                    title="Fit to Container Width"
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode(1)}
                    className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      zoomMode === 1 ? "bg-primary text-primary-foreground" : "text-muted"
                    }`}
                    title="Actual Size (100%)"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setZoomMode((curr) =>
                        typeof curr === "number"
                          ? Math.min(1.4, Number((curr + 0.1).toFixed(1)))
                          : Math.min(1.4, Number((fitScale + 0.1).toFixed(1)))
                      )
                    }
                    className="hover:bg-primary-soft rounded p-1 text-slate-600 dark:text-slate-300"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setFullPreviewOpen(true)}
                  title="Full-Screen Preview"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Precision Alignment & Nudge Toolbar (Appears when element selected) */}
          {selectedEl ? (
            <div className="border-border bg-card/60 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted font-medium">Selected:</span>
                <span className="text-foreground font-semibold">{selectedEl.label}</span>
                <span className="text-muted font-mono text-[11px]">
                  ({selectedEl.xMm}mm, {selectedEl.yMm}mm · {selectedEl.widthMm}×{selectedEl.heightMm}mm)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {/* Center Horizontally */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-[11px]"
                  title="Align Center Horizontally"
                  onClick={() =>
                    updateElement(selectedEl.id, {
                      xMm: Number(((template.widthMm - selectedEl.widthMm) / 2).toFixed(1)),
                    })
                  }
                >
                  <AlignCenter className="mr-1 h-3 w-3" /> Center X
                </Button>

                {/* Center Vertically */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-[11px]"
                  title="Align Center Vertically"
                  onClick={() =>
                    updateElement(selectedEl.id, {
                      yMm: Number(((template.heightMm - selectedEl.heightMm) / 2).toFixed(1)),
                    })
                  }
                >
                  Center Y
                </Button>

                {/* Standard Width (185mm) */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-[11px]"
                  title="Fit Standard Width & Center"
                  onClick={() =>
                    updateElement(selectedEl.id, {
                      widthMm: 185,
                      xMm: Number(((template.widthMm - 185) / 2).toFixed(1)),
                    })
                  }
                >
                  Std Width
                </Button>

                <div className="bg-border mx-1 h-4 w-px" />

                {/* Nudge Buttons */}
                <button
                  type="button"
                  title="Nudge Left 0.5mm"
                  onClick={() =>
                    updateElement(selectedEl.id, {
                      xMm: Math.max(0, Number((selectedEl.xMm - 0.5).toFixed(1))),
                    })
                  }
                  className="hover:bg-primary-soft rounded p-1 text-slate-700 dark:text-slate-300"
                >
                  <ArrowLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Nudge Right 0.5mm"
                  onClick={() =>
                    updateElement(selectedEl.id, {
                      xMm: Math.min(
                        template.widthMm - selectedEl.widthMm,
                        Number((selectedEl.xMm + 0.5).toFixed(1))
                      ),
                    })
                  }
                  className="hover:bg-primary-soft rounded p-1 text-slate-700 dark:text-slate-300"
                >
                  <ArrowRight className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Nudge Up 0.5mm"
                  onClick={() =>
                    updateElement(selectedEl.id, {
                      yMm: Math.max(0, Number((selectedEl.yMm - 0.5).toFixed(1))),
                    })
                  }
                  className="hover:bg-primary-soft rounded p-1 text-slate-700 dark:text-slate-300"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Nudge Down 0.5mm"
                  onClick={() =>
                    updateElement(selectedEl.id, {
                      yMm: Math.min(
                        template.heightMm - selectedEl.heightMm,
                        Number((selectedEl.yMm + 0.5).toFixed(1))
                      ),
                    })
                  }
                  className="hover:bg-primary-soft rounded p-1 text-slate-700 dark:text-slate-300"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>

                <div className="bg-border mx-1 h-4 w-px" />

                <button
                  type="button"
                  title={selectedEl.locked ? "Unlock Element" : "Lock Element"}
                  onClick={() =>
                    updateElement(selectedEl.id, { locked: !selectedEl.locked })
                  }
                  className="hover:bg-primary-soft rounded p-1 text-slate-700 dark:text-slate-300"
                >
                  {selectedEl.locked ? (
                    <Lock className="h-3 w-3 text-amber-500" />
                  ) : (
                    <Unlock className="h-3 w-3" />
                  )}
                </button>

                <button
                  type="button"
                  title="Duplicate Element (Ctrl+D)"
                  onClick={duplicateSelected}
                  className="hover:bg-primary-soft rounded p-1 text-slate-700 dark:text-slate-300"
                >
                  <Copy className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  title="Remove Element (Del)"
                  onClick={() => {
                    commitTemplate((prev) => ({
                      ...prev,
                      elements: prev.elements.filter((el) => el.id !== selectedEl.id),
                    }));
                    setSelectedId("");
                  }}
                  className="hover:bg-danger-soft text-danger rounded p-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : null}

          {/* Interactive Live Canvas Area */}
          <div
            ref={canvasContainerRef}
            className="border-border bg-slate-900/5 relative w-full overflow-auto rounded-2xl border p-4 select-none dark:bg-slate-950/40"
          >
            <div
              style={{
                width: `${1122.52 * effectiveScale}px`,
                height: `${793.7 * effectiveScale}px`,
                position: "relative",
                margin: "0 auto",
                transition: "width 0.15s ease-out, height 0.15s ease-out",
              }}
            >
              <div
                style={{
                  width: "297mm",
                  height: "210mm",
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: "top left",
                  position: "relative",
                  boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.22)",
                }}
              >
                {/* Certificate Rendered HTML (Exact match to Chromium PDF) */}
                <div dangerouslySetInnerHTML={{ __html: previewInnerHtml }} />

                {/* Center Guidelines Overlay */}
                {showCenterGuides ? (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        left: "148.5mm",
                        top: 0,
                        bottom: 0,
                        width: "1px",
                        borderLeft: "1px dashed rgba(239, 68, 68, 0.7)",
                        pointerEvents: "none",
                        zIndex: 25,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "105mm",
                        left: 0,
                        right: 0,
                        height: "1px",
                        borderTop: "1px dashed rgba(239, 68, 68, 0.7)",
                        pointerEvents: "none",
                        zIndex: 25,
                      }}
                    />
                  </>
                ) : null}

                {/* 10mm Grid Overlay */}
                {showGrid ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "radial-gradient(circle, rgba(148, 163, 184, 0.45) 1px, transparent 1px)",
                      backgroundSize: "10mm 10mm",
                      pointerEvents: "none",
                      zIndex: 24,
                    }}
                  />
                ) : null}

                {/* Interactive Selection, Resizing & Drag Handles */}
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
                        zIndex: (el.zIndex ?? 5) + 30,
                        cursor: el.locked ? "pointer" : "move",
                      }}
                      className={`group transition-all ${
                        isSel
                          ? "ring-2 ring-blue-600 ring-offset-1 ring-offset-white/80 dark:ring-blue-400"
                          : "hover:ring-1 hover:ring-blue-400/80"
                      }`}
                      title={`${el.label} (${el.xMm}mm, ${el.yMm}mm)`}
                    >
                      {/* Corner Drag Indicator dots on selected element */}
                      {isSel && !el.locked ? (
                        <>
                          <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full border border-white bg-blue-600 shadow-sm" />
                          <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full border border-white bg-blue-600 shadow-sm" />
                          <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full border border-white bg-blue-600 shadow-sm" />
                          <div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full border border-white bg-blue-600 shadow-sm" />
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Validation & Pre-Flight Check Card */}
          <Card className="border-border/80">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-primary h-4 w-4" />
                  <CardTitle className="text-xs font-semibold">
                    Pre-Export PDF Quality &amp; Compliance Checker
                  </CardTitle>
                </div>
                <Badge variant={validation.valid ? "success" : "danger"} size="sm">
                  {validation.valid ? "Ready for A4 Chromium Export" : "Compliance Issues Found"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0 text-xs">
              {validation.errors.length === 0 && validation.warnings.length === 0 ? (
                <p className="text-muted text-[11px]">
                  All certificate elements are positioned within A4 Landscape margins (297×210mm).
                  Font scaling, QR verification code, and responsive line lengths validated.
                </p>
              ) : null}
              {validation.errors.map((err) => (
                <p key={err} className="text-danger flex items-center gap-1.5 text-[11px]">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {err}
                </p>
              ))}
              {validation.warnings.map((w) => (
                <p key={w} className="text-warning flex items-center gap-1.5 text-[11px]">
                  <span>•</span> {w}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Studio Control & Inspector Tabs (Cols 4) */}
        <div className="space-y-3 lg:col-span-4">
          <Card className="overflow-hidden">
            {/* Tab Navigation Header */}
            <div className="border-border bg-surface/50 grid grid-cols-4 border-b p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("inspector")}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-medium transition-colors ${
                  activeTab === "inspector"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>Element</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("layers")}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-medium transition-colors ${
                  activeTab === "layers"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Layers</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("design")}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-medium transition-colors ${
                  activeTab === "design"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                <span>Style</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("placeholders")}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-medium transition-colors ${
                  activeTab === "placeholders"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Variables</span>
              </button>
            </div>

            <CardContent className="p-4">
              {/* TAB 1: ELEMENT INSPECTOR */}
              {activeTab === "inspector" ? (
                selectedEl ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted font-semibold uppercase tracking-wider text-[10px]">
                        Element Properties
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Bring to Front"
                          className="h-7 w-7 p-0"
                          onClick={() => moveLayer("top")}
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Send to Back"
                          className="h-7 w-7 p-0"
                          onClick={() => moveLayer("bottom")}
                        >
                          <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                      </div>
                    </div>

                    <Input
                      label="Element Label"
                      value={selectedEl.label}
                      onChange={(e) =>
                        updateElement(selectedEl.id, { label: e.target.value })
                      }
                    />

                    <div>
                      <Input
                        label="Content / Text / Placeholder"
                        value={selectedEl.content}
                        onChange={(e) =>
                          updateElement(selectedEl.id, { content: e.target.value })
                        }
                      />
                      {/* Quick Tag Badges */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {[
                          "{{student_name}}",
                          "{{course_name}}",
                          "{{percentage}}",
                          "{{grade}}",
                          "{{issue_date}}",
                        ].map((ph) => (
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
                    </div>

                    {/* Position & Size Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
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

                    {/* Typography Grid */}
                    <div className="space-y-2 pt-1">
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

                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          label="Size (pt)"
                          type="number"
                          step="0.5"
                          value={String(selectedEl.fontSizePt)}
                          onChange={(e) =>
                            updateElement(selectedEl.id, {
                              fontSizePt: Number(e.target.value),
                            })
                          }
                        />
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
                          label="Style"
                          value={selectedEl.fontStyle ?? "normal"}
                          onChange={(e) =>
                            updateElement(selectedEl.id, {
                              fontStyle: e.target.value as "normal" | "italic",
                            })
                          }
                          options={[
                            { label: "Regular", value: "normal" },
                            { label: "Italic", value: "italic" },
                          ]}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          label="Alignment"
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
                    </div>

                    {/* Background & Border for pills/banners */}
                    {selectedEl.type === "pill" ||
                    selectedEl.type === "banner" ||
                    selectedEl.type === "ribbon" ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Input
                          label="Background Color"
                          type="color"
                          value={selectedEl.backgroundColorHex || template.secondaryColorHex || "#0C2340"}
                          onChange={(e) =>
                            updateElement(selectedEl.id, { backgroundColorHex: e.target.value })
                          }
                        />
                        <Input
                          label="Border Color"
                          type="color"
                          value={selectedEl.borderColorHex || template.accentColorHex || "#D4AF37"}
                          onChange={(e) =>
                            updateElement(selectedEl.id, { borderColorHex: e.target.value })
                          }
                        />
                      </div>
                    ) : null}

                    {/* Delete Action */}
                    <div className="pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        fullWidth
                        leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        onClick={() => {
                          commitTemplate((prev) => ({
                            ...prev,
                            elements: prev.elements.filter((el) => el.id !== selectedEl.id),
                          }));
                          setSelectedId("");
                        }}
                      >
                        Delete Element
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-muted text-xs">
                      No element selected. Click any element on the certificate canvas to edit its properties or drag its position.
                    </p>
                  </div>
                )
              ) : null}

              {/* TAB 2: LAYERS PANEL */}
              {activeTab === "layers" ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-muted font-semibold uppercase tracking-wider text-[10px]">
                      Layers Stack ({template.elements.length})
                    </span>
                    <span className="text-muted text-[10px]">Top to Bottom</span>
                  </div>

                  <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
                    {[...template.elements]
                      .sort((a, b) => (b.zIndex ?? 5) - (a.zIndex ?? 5))
                      .map((el) => {
                        const isSel = el.id === selectedId;
                        return (
                          <div
                            key={el.id}
                            onClick={() => setSelectedId(el.id)}
                            className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 transition-colors ${
                              isSel
                                ? "bg-primary/10 border-primary font-medium"
                                : "border-border bg-surface hover:bg-card"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="text-muted font-mono text-[10px]">
                                z:{el.zIndex ?? 5}
                              </span>
                              <span className="truncate text-xs">{el.label}</span>
                            </div>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                title={el.visible === false ? "Show Layer" : "Hide Layer"}
                                onClick={() =>
                                  updateElement(el.id, {
                                    visible: el.visible === false ? true : false,
                                  })
                                }
                                className="hover:bg-primary-soft rounded p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              >
                                {el.visible === false ? (
                                  <EyeOff className="h-3 w-3 text-red-500" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                title={el.locked ? "Unlock" : "Lock"}
                                onClick={() =>
                                  updateElement(el.id, { locked: !el.locked })
                                }
                                className="hover:bg-primary-soft rounded p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                              >
                                {el.locked ? (
                                  <Lock className="h-3 w-3 text-amber-500" />
                                ) : (
                                  <Unlock className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : null}

              {/* TAB 3: DESIGN & CANVAS STYLING */}
              {activeTab === "design" ? (
                <div className="space-y-3 text-xs">
                  <Input
                    label="Template Title"
                    value={template.name}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      label="Canvas Bg"
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
                      label="Primary Accent"
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

                  <div className="border-border space-y-2 border-t pt-2">
                    <span className="text-muted font-semibold uppercase tracking-wider text-[10px]">
                      Ornate Border &amp; Effects
                    </span>
                    <div className="space-y-1.5">
                      <label className="flex cursor-pointer items-center gap-2">
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
                        <span>Double Gold Inset Border</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
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
                        <span>Ornate Corner Ribbons</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
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
                        <span>Guilloche Anti-Counterfeit Waves</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-border space-y-2 border-t pt-2">
                    <span className="text-muted font-semibold uppercase tracking-wider text-[10px]">
                      Security Watermark
                    </span>
                    <Input
                      label="Watermark Text"
                      placeholder="e.g. OFFICIAL DIPLOMA"
                      value={template.watermarkText || ""}
                      onChange={(e) =>
                        setTemplate((prev) => ({
                          ...prev,
                          watermarkText: e.target.value,
                        }))
                      }
                    />
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted">Watermark Opacity:</span>
                        <span className="font-mono">
                          {Math.round((template.watermarkOpacity ?? 0.04) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.2"
                        step="0.01"
                        value={template.watermarkOpacity ?? 0.04}
                        onChange={(e) =>
                          setTemplate((prev) => ({
                            ...prev,
                            watermarkOpacity: Number(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Backup / JSON Transfer Suite */}
                  <div className="border-border space-y-2 border-t pt-2">
                    <span className="text-muted font-semibold uppercase tracking-wider text-[10px]">
                      Template Backup &amp; Transfer
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<FileDown className="h-3 w-3" />}
                        onClick={handleExportJson}
                      >
                        Export JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Upload className="h-3 w-3" />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Import JSON
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportJson}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TAB 4: VARIABLES & PLACEHOLDERS */}
              {activeTab === "placeholders" ? (
                <div className="space-y-3 text-xs">
                  <p className="text-muted text-[11px]">
                    Click any variable to append it to the selected element, or copy the key to your clipboard.
                  </p>

                  <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
                    {CATEGORIZED_PLACEHOLDERS.map((cat) => (
                      <div key={cat.category} className="space-y-1.5">
                        <span className="text-muted font-semibold uppercase tracking-wider text-[10px]">
                          {cat.category}
                        </span>
                        <div className="space-y-1">
                          {cat.items.map((item) => (
                            <div
                              key={item.key}
                              className="border-border bg-surface flex items-center justify-between rounded-lg border p-1.5"
                            >
                              <div>
                                <p className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                  {item.key}
                                </p>
                                <p className="text-muted text-[10px]">{item.label}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px]"
                                  onClick={() => {
                                    if (selectedEl) {
                                      updateElement(selectedEl.id, {
                                        content: `${selectedEl.content} ${item.key}`.trim(),
                                      });
                                    } else {
                                      addElement("placeholder", item.key, item.label);
                                    }
                                  }}
                                  title="Insert into Selected Element"
                                >
                                  + Insert
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.key);
                                    setMessage(`Copied ${item.key} to clipboard.`);
                                  }}
                                  title="Copy Variable Key"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preset Picker Modal with Visual Design Cards */}
      <ResponsiveFormModal
        open={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        title="Professional Certificate Design Presets"
        subtitle="Choose from elite academic, executive, corporate, and masterclass layouts"
      >
        <div className="grid grid-cols-1 gap-4 p-1 md:grid-cols-2">
          {CERTIFICATE_PRESETS_CATALOG.map((preset) => (
            <div
              key={preset.id}
              className="border-border hover:border-primary bg-card group relative flex flex-col justify-between rounded-xl border p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" size="sm">
                    {preset.category}
                  </Badge>
                  {/* Swatches */}
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{ backgroundColor: preset.bgPreview }}
                      className="h-4 w-4 rounded-full border border-slate-300 shadow-xs"
                      title="Background"
                    />
                    <span
                      style={{ backgroundColor: preset.primaryColor }}
                      className="h-4 w-4 rounded-full shadow-xs"
                      title="Primary Color"
                    />
                    <span
                      style={{ backgroundColor: preset.accentColor }}
                      className="h-4 w-4 rounded-full shadow-xs"
                      title="Gold Accent"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-foreground font-bold">{preset.name}</h3>
                  <p className="text-muted text-xs">{preset.subtitle}</p>
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed">
                  {preset.description}
                </p>
              </div>

              <div className="pt-4">
                <Button
                  size="sm"
                  fullWidth
                  variant={template.presetKey === preset.key ? "secondary" : "outline"}
                  onClick={() => handleApplyPreset(preset)}
                >
                  {template.presetKey === preset.key ? "Currently Active" : "Apply This Preset"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ResponsiveFormModal>

      {/* Full-Size A4 Preview Modal */}
      <ResponsiveFormModal
        open={fullPreviewOpen}
        onClose={() => setFullPreviewOpen(false)}
        title="Full-Size A4 Landscape Preview"
        subtitle="297mm × 210mm — 100% Exact match to exported PDF"
      >
        <div className="max-h-[75vh] overflow-auto rounded-xl border bg-slate-100 p-6 dark:bg-slate-900">
          <div
            style={{ width: "297mm", height: "210mm", margin: "0 auto" }}
            dangerouslySetInnerHTML={{ __html: previewInnerHtml }}
          />
        </div>
      </ResponsiveFormModal>
    </div>
  );
}
