"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingCreditNoteRecord, BillingInvoiceRecord } from "@/types/billing";

export function BillingInvoicesClient({
  initialInvoices,
  initialCreditNotes,
  institutes,
}: {
  initialInvoices: BillingInvoiceRecord[];
  initialCreditNotes: BillingCreditNoteRecord[];
  institutes: Array<{ id: string; name: string; code: string }>;
}) {
  const [invoices, setInvoices] = React.useState(initialInvoices);
  const [creditNotes, setCreditNotes] = React.useState(initialCreditNotes);
  const [instituteId, setInstituteId] = React.useState(institutes[0]?.id ?? "");
  const [sellerLegalName, setSellerLegalName] = React.useState(
    "CertiDesk Pro Technologies Pvt. Ltd."
  );
  const [sellerGstin, setSellerGstin] = React.useState("");
  const [itemDesc, setItemDesc] = React.useState("Platform Subscription / Service Fee");
  const [unitPriceRupees, setUnitPriceRupees] = React.useState("1999");
  const [taxRatePercent, setTaxRatePercent] = React.useState("18");
  const [dueDate, setDueDate] = React.useState(() =>
    new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const totalInvoicedPaise = invoices.reduce((s, i) => s + i.totalAmountPaise, 0);
  const totalPaidPaise = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.totalAmountPaise, 0);
  const outstandingPaise = invoices
    .filter(
      (i) => i.status === "issued" || i.status === "pending" || i.status === "overdue"
    )
    .reduce((s, i) => s + i.totalAmountPaise, 0);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/su/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          instituteId,
          billingType: "subscription",
          dueDate,
          sellerLegalName,
          sellerGstin: sellerGstin.trim() || null,
          lineItems: [
            {
              description: itemDesc,
              quantity: 1,
              unitPriceRupees: Number(unitPriceRupees),
              taxRatePercent: Number(taxRatePercent),
            },
          ],
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { invoice: BillingInvoiceRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to generate invoice.");
        return;
      }
      setInvoices((prev) => [json.data!.invoice, ...prev]);
      setMessage(`Issued invoice ${json.data.invoice.invoiceNumber}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (inv: BillingInvoiceRecord) => {
    const ref = window.prompt(
      `Enter verified payment reference for ${inv.invoiceNumber}:`
    );
    if (!ref || !ref.trim()) return;
    const res = await fetch("/api/su/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record_payment",
        invoiceId: inv.id,
        paymentReference: ref.trim(),
      }),
    });
    const json = (await res.json()) as {
      ok: boolean;
      data?: { invoice: BillingInvoiceRecord };
    };
    if (res.ok && json.ok && json.data) {
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? json.data!.invoice : i)));
    }
  };

  const handleCreditNote = async (inv: BillingInvoiceRecord) => {
    const reason = window.prompt(`Enter credit note reason for ${inv.invoiceNumber}:`);
    if (!reason || !reason.trim()) return;
    const res = await fetch("/api/su/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "credit_note",
        invoiceId: inv.id,
        amountRupees: inv.totalAmountPaise / 100,
        reason: reason.trim(),
      }),
    });
    const json = (await res.json()) as {
      ok: boolean;
      data?: { creditNote: BillingCreditNoteRecord };
    };
    if (res.ok && json.ok && json.data) {
      setCreditNotes((prev) => [json.data!.creditNote, ...prev]);
      setInvoices((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, status: "credited" } : i))
      );
    }
  };

  const exportCsv = () => {
    const header = [
      "InvoiceNumber",
      "Date",
      "Institute",
      "Taxable",
      "Tax",
      "Total",
      "Status",
      "PaymentRef",
    ];
    const rows = invoices.map((i) => [
      i.invoiceNumber,
      i.issueDate,
      i.instituteName,
      (i.taxableAmountPaise / 100).toFixed(2),
      (i.taxAmountPaise / 100).toFixed(2),
      (i.totalAmountPaise / 100).toFixed(2),
      i.status,
      i.paymentReference ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-register-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Issued Invoices</p>
            <p className="mt-1 font-mono text-xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Total Invoiced</p>
            <p className="mt-1 font-mono text-xl font-bold">
              ₹{(totalInvoicedPaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Paid Collections</p>
            <p className="text-success mt-1 font-mono text-xl font-bold">
              ₹{(totalPaidPaise / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted text-xs">Outstanding / Credit Notes</p>
            <p className="mt-1 font-mono text-xl font-bold">
              ₹{(outstandingPaise / 100).toFixed(2)} ({creditNotes.length} CN)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="text-primary h-4 w-4" aria-hidden="true" />
              Generate Sequential Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <div
                role="alert"
                className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{message}</span>
              </div>
            )}
            <form onSubmit={handleGenerate} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium">Institute</label>
                <select
                  value={instituteId}
                  onChange={(e) => setInstituteId(e.target.value)}
                  className="border-border bg-background h-10 w-full rounded-lg border px-2.5"
                >
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Seller Legal Name"
                value={sellerLegalName}
                onChange={(e) => setSellerLegalName(e.target.value)}
                required
              />
              <Input
                label="Seller GSTIN (Optional)"
                value={sellerGstin}
                onChange={(e) => setSellerGstin(e.target.value)}
              />
              <Input
                label="Line Item Description"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                required
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Price (₹)"
                  type="number"
                  value={unitPriceRupees}
                  onChange={(e) => setUnitPriceRupees(e.target.value)}
                  required
                />
                <Input
                  label="Tax (%)"
                  type="number"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                  required
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" size="sm" loading={loading} disabled={!instituteId}>
                Issue Invoice
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="text-primary h-4 w-4" aria-hidden="true" />
              Invoice Register ({invoices.length})
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportCsv}
              leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <p className="text-muted p-6 text-center text-sm">
                No billing invoices issued yet. Wallet recharges are tracked separately as
                liabilities.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-border bg-surface text-muted border-b">
                    <tr>
                      <th className="px-4 py-2.5">Invoice #</th>
                      <th className="px-4 py-2.5">Institute</th>
                      <th className="px-4 py-2.5">Total</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-2.5 font-mono">
                          <p className="font-semibold">{inv.invoiceNumber}</p>
                          <p className="text-muted">{inv.issueDate}</p>
                        </td>
                        <td className="px-4 py-2.5">{inv.instituteName}</td>
                        <td className="px-4 py-2.5 font-mono font-semibold">
                          ₹{(inv.totalAmountPaise / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant={
                              inv.status === "paid"
                                ? "success"
                                : inv.status === "credited"
                                  ? "danger"
                                  : "outline"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            <a
                              href={`/api/su/billing/invoices/${inv.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="border-border hover:bg-surface rounded border px-2 py-1 text-[11px] font-medium"
                            >
                              PDF
                            </a>
                            {inv.status === "issued" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRecordPayment(inv)}
                                  className="border-border hover:bg-surface cursor-pointer rounded border px-2 py-1 text-[11px] font-medium"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCreditNote(inv)}
                                  className="border-border text-danger hover:bg-surface cursor-pointer rounded border px-2 py-1 text-[11px] font-medium"
                                >
                                  Credit Note
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
