"use client";

import { Sliders } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanVersionRecord } from "@/types/billing";

export function EntitlementsRegistryClient({
  features,
  planVersions,
}: {
  features: ReadonlyArray<{ key: string; module: string; label: string }>;
  planVersions: PlanVersionRecord[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sliders className="text-primary h-4 w-4" aria-hidden="true" />
          Central Feature Registry &amp; Plan Comparison ({features.length} features)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-border bg-surface text-muted border-b">
              <tr>
                <th className="px-4 py-2.5">Module</th>
                <th className="px-4 py-2.5">Feature Key</th>
                <th className="px-4 py-2.5">Description</th>
                {planVersions.slice(0, 4).map((pv) => (
                  <th key={pv.id} className="px-4 py-2.5">
                    {pv.planCode} v{pv.version}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {features.map((f) => (
                <tr key={f.key}>
                  <td className="px-4 py-2 font-medium">{f.module}</td>
                  <td className="px-4 py-2 font-mono">{f.key}</td>
                  <td className="text-muted px-4 py-2">{f.label}</td>
                  {planVersions.slice(0, 4).map((pv) => (
                    <td key={pv.id} className="px-4 py-2">
                      {pv.features.includes(f.key) ? (
                        <Badge variant="success">Included</Badge>
                      ) : (
                        <Badge variant="outline">—</Badge>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
