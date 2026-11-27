"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  CertificateTemplateElement,
  CertificateTemplateRecord,
  TemplateFontFamily,
} from "@/types/templates";

export function CertificateStudioClient({
  initialTemplate,
}: {
  initialTemplate: CertificateTemplateRecord;
}) {
  const router = useRouter();
  const [template, setTemplate] = React.useState(initialTemplate);
  const [selectedId, setSelectedId] = React.useState(
    initialTemplate.elements[0]?.id ?? ""
  );
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const selectedEl = template.elements.find((e) => e.id === selectedId);

  const updateElement = (id: string, patch: Partial<CertificateTemplateElement>) => {
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    }));
  };

  const addElement = (type: CertificateTemplateElement["type"]) => {
    const id = `el_${Date.now()}`;
    const newEl: CertificateTemplateElement = {
      id,
      type,
      label: type === "qr_code" ? "QR Code" : "New Text",
      content:
        type === "placeholder"
          ? "{{student_name}}"
          : type === "qr_code"
            ? "QR"
            : "Custom Text",
      xMm: 40,
      yMm: 90,
      widthMm: type === "qr_code" ? 28 : 160,
      heightMm: type === "qr_code" ? 28 : 10,
      fontFamily: "Helvetica",
      fontSizePt: 14,
      fontWeight: "normal",
      colorHex: "#0F172A",
      align: "center",
    };
    setTemplate((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedId(id);
  };

  const saveTemplate = async (status: "draft" | "published") => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/su/templates/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...template, status }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { template: CertificateTemplateRecord };
      };
      if (res.ok && json.ok && json.data) {
        setTemplate(json.data.template);
        setMessage(`Saved ${json.data.template.status} v${json.data.template.version}.`);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-foreground text-xl font-bold">{template.name}</h2>
          <Badge variant={template.status === "published" ? "success" : "outline"}>
            {template.status} v{template.version}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => addElement("placeholder")}
          >
            Add Placeholder
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
            Publish Version
          </Button>
        </div>
      </div>

      {message ? (
        <div className="bg-success-soft text-success flex items-center gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-sm">
              A4 {template.orientation} Canvas ({template.widthMm}mm × {template.heightMm}
              mm)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="relative mx-auto w-full overflow-hidden rounded-lg border shadow-sm"
              style={{
                aspectRatio: `${template.widthMm} / ${template.heightMm}`,
                backgroundColor: template.backgroundColorHex,
                borderColor: template.borderColorHex,
                borderWidth: "4px",
              }}
            >
              {template.elements.map((el) => {
                const isSel = el.id === selectedId;
                return (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setSelectedId(el.id)}
                    style={{
                      left: `${(el.xMm / template.widthMm) * 100}%`,
                      top: `${(el.yMm / template.heightMm) * 100}%`,
                      width: `${(el.widthMm / template.widthMm) * 100}%`,
                      color: el.colorHex,
                      textAlign: el.align,
                      fontWeight: el.fontWeight,
                    }}
                    className={`absolute cursor-pointer rounded px-1 py-0.5 text-xs transition-all ${
                      isSel ? "ring-primary bg-primary/5 ring-2" : "hover:ring-1"
                    }`}
                  >
                    {el.type === "qr_code" ? "[QR CODE]" : el.content}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm">Coordinate &amp; Style Inspector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedEl ? (
              <>
                <Input
                  label="Content / Placeholder"
                  value={selectedEl.content}
                  onChange={(e) =>
                    updateElement(selectedEl.id, { content: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="X (mm)"
                    type="number"
                    value={String(selectedEl.xMm)}
                    onChange={(e) =>
                      updateElement(selectedEl.id, { xMm: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Y (mm)"
                    type="number"
                    value={String(selectedEl.yMm)}
                    onChange={(e) =>
                      updateElement(selectedEl.id, { yMm: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Width (mm)"
                    type="number"
                    value={String(selectedEl.widthMm)}
                    onChange={(e) =>
                      updateElement(selectedEl.id, { widthMm: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Font Size (pt)"
                    type="number"
                    value={String(selectedEl.fontSizePt)}
                    onChange={(e) =>
                      updateElement(selectedEl.id, {
                        fontSizePt: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="Font"
                    value={selectedEl.fontFamily}
                    onChange={(e) =>
                      updateElement(selectedEl.id, {
                        fontFamily: e.target.value as TemplateFontFamily,
                      })
                    }
                    options={[
                      { label: "Helvetica", value: "Helvetica" },
                      { label: "Times Roman", value: "TimesRoman" },
                      { label: "Courier", value: "Courier" },
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
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  fullWidth
                  leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() =>
                    setTemplate((prev) => ({
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
                Click any element on the canvas to edit.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
