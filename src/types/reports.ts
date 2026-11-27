export type ApprovedReportDataset =
  | "institutes"
  | "wallet_transactions"
  | "payment_orders"
  | "billing_invoices"
  | "security_login_events"
  | "audit_logs";

export type ReportRange = "7d" | "30d" | "90d" | "all";

export interface ReportMetricDefinition {
  key: string;
  label: string;
  value: string;
  definition: string;
  source: string;
  calculation: string;
  timeWindow: string;
}

export interface ReportDefinitionRecord {
  id: string;
  name: string;
  category: "business" | "financial" | "usage" | "security";
  dataset: ApprovedReportDataset;
  range: ReportRange;
  groupBy: string | null;
  filters: Record<string, string>;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportScheduleRecord {
  id: string;
  name: string;
  category: "business" | "financial" | "usage" | "security";
  cadence: "daily" | "weekly" | "monthly";
  timezone: string;
  recipients: string[];
  enabled: boolean;
  lastRunAt: string | null;
  lastDeliveryStatus: "never_run" | "provider_not_configured" | "sent" | "failed";
  lastError: string | null;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExportRecord {
  id: string;
  reportType: string;
  format: "csv" | "json";
  rowCount: number;
  actorUid: string;
  createdAt: string;
}
