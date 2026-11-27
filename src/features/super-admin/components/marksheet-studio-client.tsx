"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarksheetTemplateRecord } from "@/types/templates";

export function MarksheetStudioClient({
  initialTemplate,
}: {
  initialTemplate: MarksheetTemplateRecord;
}) {
  const router = useRouter();
  const [template, setTemplate] = React.useState(initialTemplate);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const saveTemplate = async (status: "draft" | "published") => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/su/templates/marksheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...template, status }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { template: MarksheetTemplateRecord };
      };
      if (res.ok && json.ok && json.data) {
        setTemplate(json.data.template);
        setMessage(
          `Saved marksheet template (${json.data.template.status} v${json.data.template.version}).`
        );
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
        <div className="flex gap-2">
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
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-sm">Template Header &amp; Footer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Template Name"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            />
            <Input
              label="Header Title"
              value={template.headerTitle}
              onChange={(e) => setTemplate({ ...template, headerTitle: e.target.value })}
            />
            <Input
              label="Footer Note"
              value={template.footerNote}
              onChange={(e) => setTemplate({ ...template, footerNote: e.target.value })}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm">
              Dynamic Subject Table Columns ({template.columns.length})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() =>
                setTemplate((prev) => ({
                  ...prev,
                  columns: [
                    ...prev.columns,
                    {
                      key: `col_${prev.columns.length + 1}`,
                      label: "New Column",
                      widthPercent: 15,
                      align: "center",
                    },
                  ],
                }))
              }
            >
              Add Column
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {template.columns.map((col, idx) => (
              <div key={col.key} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-5">
                  <Input
                    value={col.label}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        columns: prev.columns.map((c, i) =>
                          i === idx ? { ...c, label: e.target.value } : c
                        ),
                      }))
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    value={String(col.widthPercent)}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        columns: prev.columns.map((c, i) =>
                          i === idx ? { ...c, widthPercent: Number(e.target.value) } : c
                        ),
                      }))
                    }
                  />
                </div>
                <div className="text-muted col-span-3 font-mono text-xs">{col.key}</div>
                <div className="col-span-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setTemplate((prev) => ({
                        ...prev,
                        columns: prev.columns.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
