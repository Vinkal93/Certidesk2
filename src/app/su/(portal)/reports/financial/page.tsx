import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { getFinancialReportData } from "@/services/reports.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomReportBuilder } from "@/features/super-admin/components/custom-report-builder";

export const metadata: Metadata = {
  title: "Financial Reports",
  robots: { index: false, follow: false },
};

export default async function SuReportsFinancialPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const data = await getFinancialReportData(user, "30d");
  const s = data.summary;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Financial Reconciliation &amp; Accounting Reports
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Strictly separates Razorpay collections, prepaid wallet liabilities (paid vs
            promotional bonus), and recognized service debits · Freshness:{" "}
            <span className="font-mono">{data.freshnessAt.slice(0, 19)} UTC</span>
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/su/reports/export?dataset=wallet_transactions&range=30d&format=csv"
            className="border-border bg-background hover:bg-surface inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export Ledger CSV
          </a>
          <a
            href="/api/su/reports/export?dataset=payment_orders&range=30d&format=csv"
            className="border-border bg-background hover:bg-surface inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export Payments CSV
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Verified LIVE Collections</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              ₹{(s.verifiedLiveCollectionsPaise / 100).toLocaleString("en-IN")}
            </p>
            <p className="text-muted mt-1 text-xs">
              TEST mode: ₹{(s.testCollectionsPaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Total Wallet Liability</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              ₹{(s.totalWalletLiabilityPaise / 100).toLocaleString("en-IN")}
            </p>
            <p className="text-muted mt-1 text-xs">
              Paid ₹{(s.paidWalletLiabilityPaise / 100).toFixed(2)} · Bonus ₹
              {(s.bonusWalletLiabilityPaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Service Consumption Debits</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              ₹{(s.recognizedServiceRevenuePaise / 100).toLocaleString("en-IN")}
            </p>
            <p className="text-muted mt-1 text-xs">
              Admissions ₹{(s.admissionDebitsPaise / 100).toFixed(2)} · Edits ₹
              {(s.profileEditDebitsPaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted text-xs">Invoiced / Outstanding</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              ₹{(s.invoicedTotalPaise / 100).toFixed(2)}
            </p>
            <p className="text-muted mt-1 text-xs">
              Outstanding: ₹{(s.outstandingInvoicesPaise / 100).toFixed(2)} ·{" "}
              {s.creditNotesCount} CN
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Razorpay Order &amp; Webhook Health
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border p-3">
              Captured:{" "}
              <span className="font-mono font-bold">
                {data.razorpayBreakdown.captured}
              </span>
            </div>
            <div className="rounded-lg border p-3">
              Failed:{" "}
              <span className="font-mono font-bold">{data.razorpayBreakdown.failed}</span>
            </div>
            <div className="rounded-lg border p-3">
              Refunded:{" "}
              <span className="font-mono font-bold">
                {data.razorpayBreakdown.refunded}
              </span>
            </div>
            <div className="rounded-lg border p-3">
              Webhook Failures / Dupes:{" "}
              <span className="font-mono font-bold">
                {data.razorpayBreakdown.webhookFailures} /{" "}
                {data.razorpayBreakdown.duplicateWebhooks}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Low-Balance Institutes ({data.lowBalanceInstitutes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {data.lowBalanceInstitutes.length === 0 ? (
              <p className="text-muted">
                All institutes have sufficient admission balance.
              </p>
            ) : (
              data.lowBalanceInstitutes.slice(0, 6).map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <span className="font-medium">
                    {inst.name}{" "}
                    <span className="text-muted font-mono">({inst.code})</span>
                  </span>
                  <Badge variant="danger">₹{(inst.balancePaise / 100).toFixed(2)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <CustomReportBuilder
        defaultCategory="financial"
        defaultDataset="wallet_transactions"
      />
    </div>
  );
}
