import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/security/session";
import {
  recordReportExportAudit,
  runApprovedCustomReport,
  sanitizeCsvCell,
} from "@/services/reports.service";
import { handleApiError, jsonError } from "@/lib/utils/api-response";
import type { ApprovedReportDataset, ReportRange } from "@/types/reports";

const ALLOWED_DATASETS = new Set<ApprovedReportDataset>([
  "institutes",
  "wallet_transactions",
  "payment_orders",
  "billing_invoices",
  "security_login_events",
  "audit_logs",
]);

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { searchParams } = new URL(request.url);
    const dataset = (searchParams.get("dataset") ??
      "institutes") as ApprovedReportDataset;
    const range = (searchParams.get("range") ?? "30d") as ReportRange;
    const format = searchParams.get("format") === "json" ? "json" : "csv";

    if (!ALLOWED_DATASETS.has(dataset)) {
      return jsonError(400, "INVALID_DATASET", "Unapproved report dataset.");
    }

    const { rows } = await runApprovedCustomReport(actor, {
      dataset,
      range,
      limit: 200,
    });

    await recordReportExportAudit(actor, dataset, format, rows.length);

    if (format === "json") {
      return NextResponse.json({ ok: true, dataset, range, rows });
    }

    const keys = rows.length > 0 ? Object.keys(rows[0]!) : ["empty"];
    const lines = [
      keys.map((k) => sanitizeCsvCell(k)).join(","),
      ...rows.map((row) => keys.map((k) => sanitizeCsvCell(row[k])).join(",")),
    ];

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dataset}-${range}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
