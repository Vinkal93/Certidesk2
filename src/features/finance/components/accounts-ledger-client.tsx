"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  FeePaymentMethod,
  InstituteAccountRecord,
  InstituteCategoryRecord,
  InstituteLedgerEntryRecord,
} from "@/types/finance";

export function AccountsLedgerClient({
  mode,
  categories,
  accounts,
  entries,
}: {
  mode: "income" | "expense" | "categories" | "ledgers";
  categories: InstituteCategoryRecord[];
  accounts: InstituteAccountRecord[];
  entries: InstituteLedgerEntryRecord[];
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Shared form fields
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = React.useState("");
  const [vendorOrPayee, setVendorOrPayee] = React.useState("");
  const [amountRupees, setAmountRupees] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<FeePaymentMethod>("cash");
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = React.useState(accounts[1]?.id ?? "");
  const [categoryId, setCategoryId] = React.useState("");
  const [reference, setReference] = React.useState("");

  // Category / Account creation fields
  const [catName, setCatName] = React.useState("");
  const [catType, setCatType] = React.useState<"income" | "expense">("expense");
  const [accName, setAccName] = React.useState("");
  const [accType, setAccType] = React.useState<"cash" | "bank" | "upi">("cash");
  const [openingRupees, setOpeningRupees] = React.useState("0");

  const filteredCats = categories.filter((c) =>
    mode === "income"
      ? c.type === "income"
      : mode === "expense"
        ? c.type === "expense"
        : true
  );

  const postAction = async (payload: Record<string, unknown>, successMsg: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Operation failed.");
        return;
      }
      setMessage(successMsg);
      setDescription("");
      setAmountRupees("");
      setVendorOrPayee("");
      setReference("");
      setCatName("");
      setAccName("");
      router.refresh();
    } catch {
      setError("Network error while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-xs"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
      {message ? (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-xs">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}

      {mode === "categories" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Add Income / Expense Category</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void postAction(
                    { action: "create_category", name: catName, type: catType },
                    "Category created."
                  );
                }}
                className="space-y-4"
              >
                <Input
                  label="Category Name"
                  required
                  placeholder="e.g. Lab Rent, Electricity, Donations"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
                <Select
                  label="Type"
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as "income" | "expense")}
                  options={[
                    { label: "Expense", value: "expense" },
                    { label: "Non-Fee Income", value: "income" },
                  ]}
                />
                <Button type="submit" loading={loading} fullWidth>
                  Save Category
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle>Configured Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-border divide-y text-sm">
                {categories.length === 0 ? (
                  <p className="text-muted py-6 text-center text-xs">
                    No categories created yet.
                  </p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="text-foreground font-medium">{cat.name}</p>
                        <p className="text-muted text-xs">{cat.type.toUpperCase()}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void postAction(
                            { action: "delete_category", categoryId: cat.id },
                            "Category deleted."
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {mode === "ledgers" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Add Cash / Bank Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void postAction(
                    {
                      action: "create_account",
                      name: accName,
                      accountType: accType,
                      openingBalanceRupees: Number(openingRupees || 0),
                    },
                    "Account created."
                  );
                }}
                className="space-y-4"
              >
                <Input
                  label="Account Name"
                  required
                  placeholder="e.g. Main Cash Counter, HDFC Current A/C"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Account Type"
                    value={accType}
                    onChange={(e) =>
                      setAccType(e.target.value as "cash" | "bank" | "upi")
                    }
                    options={[
                      { label: "Cash", value: "cash" },
                      { label: "Bank", value: "bank" },
                      { label: "UPI", value: "upi" },
                    ]}
                  />
                  <Input
                    label="Opening Balance (₹)"
                    type="number"
                    min={0}
                    value={openingRupees}
                    onChange={(e) => setOpeningRupees(e.target.value)}
                  />
                </div>
                <Button type="submit" loading={loading} fullWidth>
                  Create Account
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Recorded Account Ledger Balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted text-xs">
                Balances shown are derived from recorded institute ledger entries and are
                distinct from external bank statement feeds.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="border-border bg-surface rounded-xl border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-foreground text-sm font-semibold">
                        {acc.name}
                      </span>
                      <Badge variant="primary">{acc.accountType.toUpperCase()}</Badge>
                    </div>
                    <p className="text-foreground mt-2 text-xl font-bold tabular-nums">
                      ₹{(acc.ledgerBalancePaise / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              {accounts.length >= 2 ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void postAction(
                      {
                        action: "record_entry",
                        entryType: "transfer",
                        date,
                        description: description || "Internal account transfer",
                        amountRupees: Number(amountRupees),
                        paymentMethod: "bank_transfer",
                        accountId,
                        toAccountId,
                        reference: reference || undefined,
                      },
                      "Internal transfer recorded without creating artificial income or expense."
                    );
                  }}
                  className="border-border space-y-3 border-t pt-4"
                >
                  <p className="text-foreground text-xs font-semibold">
                    Record Account Transfer
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Select
                      label="From"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      options={accounts.map((a) => ({ label: a.name, value: a.id }))}
                    />
                    <Select
                      label="To"
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      options={accounts.map((a) => ({ label: a.name, value: a.id }))}
                    />
                    <Input
                      label="Amount (₹)"
                      type="number"
                      min={1}
                      required
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="sm" loading={loading}>
                    Transfer Funds
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {mode === "income" || mode === "expense" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>
                {mode === "income" ? "Record Non-Fee Income" : "Record Expense"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cat = filteredCats.find((c) => c.id === categoryId);
                  void postAction(
                    {
                      action: "record_entry",
                      entryType: mode,
                      date,
                      categoryId: cat?.id,
                      categoryName:
                        cat?.name ??
                        (mode === "income" ? "Other Income" : "Operating Expense"),
                      description,
                      vendorOrPayee: vendorOrPayee || undefined,
                      amountRupees: Number(amountRupees),
                      paymentMethod,
                      accountId,
                      reference: reference || undefined,
                    },
                    `${mode === "income" ? "Income" : "Expense"} recorded.`
                  );
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Input
                    label="Amount (₹)"
                    type="number"
                    min={1}
                    required
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                  />
                </div>
                <Select
                  label="Category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  options={[
                    { label: "General", value: "" },
                    ...filteredCats.map((c) => ({ label: c.name, value: c.id })),
                  ]}
                />
                <Input
                  label="Description"
                  required
                  placeholder={
                    mode === "income"
                      ? "e.g. Workshop registration / Book sale"
                      : "e.g. Monthly broadband & lab electricity"
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {mode === "expense" ? (
                  <Input
                    label="Vendor / Payee"
                    placeholder="e.g. Airtel Business / Landlord"
                    value={vendorOrPayee}
                    onChange={(e) => setVendorOrPayee(e.target.value)}
                  />
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as FeePaymentMethod)}
                    options={[
                      { label: "Cash", value: "cash" },
                      { label: "UPI", value: "upi" },
                      { label: "Bank Transfer", value: "bank_transfer" },
                      { label: "Card", value: "card" },
                    ]}
                  />
                  <Select
                    label="Account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    options={
                      accounts.length === 0
                        ? [{ label: "Create account first", value: "" }]
                        : accounts.map((a) => ({ label: a.name, value: a.id }))
                    }
                  />
                </div>
                <Input
                  label="Reference (optional)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <Button type="submit" loading={loading} fullWidth disabled={!accountId}>
                  Save {mode === "income" ? "Income" : "Expense"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>
                {mode === "income" ? "Non-Fee Income Entries" : "Recorded Expenses"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-border bg-surface text-muted border-b">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Description</th>
                      <th className="px-3 py-2 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {entries
                      .filter((e) => e.entryType === mode)
                      .map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-3 py-2.5">{entry.date}</td>
                          <td className="px-3 py-2.5">{entry.categoryName}</td>
                          <td className="px-3 py-2.5">{entry.description}</td>
                          <td className="px-3 py-2.5 font-semibold tabular-nums">
                            ₹{(entry.amountPaise / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
