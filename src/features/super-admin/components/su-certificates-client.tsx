"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GlobalCertificateTemplateRecord } from "@/services/su-platform.service";

export function SuCertificatesClient({
  initialTemplates,
}: {
  initialTemplates: GlobalCertificateTemplateRecord[];
}) {
  const [templates, setTemplates] = React.useState(initialTemplates);
  const [name, setName] = React.useState("");
  const [layoutStyle, setLayoutStyle] = React.useState<"classic" | "modern" | "merit">(
    "classic"
  );
  const [numberingPrefix, setNumberingPrefix] = React.useState("CERT");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/su/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          layoutStyle,
          numberingPrefix,
          version: 1,
          active: true,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { template: GlobalCertificateTemplateRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to create template.");
        return;
      }
      setTemplates((prev) => [json.data!.template, ...prev]);
      setName("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-muted py-10 text-center text-sm">
              No global certificate templates created yet.
            </CardContent>
          </Card>
        ) : (
          templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{tpl.name}</CardTitle>
                  <p className="text-muted font-mono text-xs">
                    Layout: {tpl.layoutStyle} &bull; Prefix: {tpl.numberingPrefix} &bull;
                    v{tpl.version}
                  </p>
                </div>
                <Badge variant={tpl.active ? "success" : "default"}>
                  {tpl.active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Create Global Certificate Template</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              role="alert"
              className="bg-danger-soft text-danger mb-4 flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3.5">
            <Input
              label="Template Name"
              placeholder="e.g. National Skill Merit Seal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Select
              label="Layout Style"
              value={layoutStyle}
              onChange={(e) =>
                setLayoutStyle(e.target.value as "classic" | "modern" | "merit")
              }
              options={[
                { label: "Classic Academic Border", value: "classic" },
                { label: "Modern Minimalist Navy", value: "modern" },
                { label: "Merit Distinction Seal", value: "merit" },
              ]}
            />
            <Input
              label="Numbering Prefix"
              value={numberingPrefix}
              onChange={(e) => setNumberingPrefix(e.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={loading}>
              Save Template
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
