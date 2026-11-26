"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ReportSummaryRow {
  category: string;
  metric: string;
  value: string;
  detail: string;
}

export function ReportsClient({ rows }: { rows: ReportSummaryRow[] }) {
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  const categories = Array.from(new Set(rows.map((r) => r.category)));
  const filtered =
    categoryFilter === "all" ? rows : rows.filter((r) => r.category === categoryFilter);

  const exportCsv = () => {
    const header = ["Category", "Metric", "Value", "Detail"];
    const csvRows = filtered.map((r) => [r.category, r.metric, r.value, r.detail]);
    const csv = [header, ...csvRows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certidesk-institute-report-${categoryFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-64">
          <Select
            label="Report Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { label: "All Categories", value: "all" },
              ...categories.map((c) => ({ label: c, value: c })),
            ]}
          />
        </div>
        <Button
          variant="outline"
          leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
          onClick={exportCsv}
        >
          Export CSV / Excel
        </Button>
        <Button
          variant="outline"
          leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
          onClick={() => window.print()}
        >
          Print / Save PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institutional Analytics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border text-muted border-b text-xs uppercase">
                  <th className="py-2.5 pr-4">Category</th>
                  <th className="py-2.5 pr-4">Metric</th>
                  <th className="py-2.5 pr-4">Value</th>
                  <th className="py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-border/70 divide-y">
                {filtered.map((row) => (
                  <tr key={`${row.category}-${row.metric}`}>
                    <td className="text-primary py-3 pr-4 font-medium">{row.category}</td>
                    <td className="text-foreground py-3 pr-4 font-medium">
                      {row.metric}
                    </td>
                    <td className="py-3 pr-4 font-mono font-semibold">{row.value}</td>
                    <td className="text-muted py-3 text-xs">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
