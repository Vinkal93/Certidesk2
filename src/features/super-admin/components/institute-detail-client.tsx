"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstituteRecord, WalletTransactionRecord } from "@/types/domain";

export function InstituteDetailClient({
  initialInstitute,
  transactions,
}: {
  initialInstitute: InstituteRecord;
  transactions: WalletTransactionRecord[];
}) {
  const router = useRouter();
  const [institute, setInstitute] = React.useState(initialInstitute);
  const [name, setName] = React.useState(initialInstitute.name);
  const [ownerName, setOwnerName] = React.useState(initialInstitute.ownerName);
  const [phone, setPhone] = React.useState(initialInstitute.phone);
  const [address, setAddress] = React.useState(initialInstitute.address);
  const [admissionFeeRupees, setAdmissionFeeRupees] = React.useState(
    String(initialInstitute.pricing.admissionFeePaise / 100)
  );
  const [profileUpdateFeeRupees, setProfileUpdateFeeRupees] = React.useState(
    String(initialInstitute.pricing.profileUpdateFeePaise / 100)
  );
  const [certificateFeeRupees, setCertificateFeeRupees] = React.useState(
    String(initialInstitute.pricing.certificateFeePaise / 100)
  );

  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [resetPassword, setResetPassword] = React.useState<string | null>(null);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/su/institutes/${institute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ownerName,
          phone,
          address,
          admissionFeeRupees: Number(admissionFeeRupees),
          profileUpdateFeeRupees: Number(profileUpdateFeeRupees),
          certificateFeeRupees: Number(certificateFeeRupees),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { institute: InstituteRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to update institute.");
        return;
      }
      setInstitute(json.data.institute);
      setMessage("Institute details updated.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: "activate" | "suspend" | "reset_access") => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setResetPassword(null);
    try {
      const res = await fetch(`/api/su/institutes/${institute.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          institute?: InstituteRecord;
          reset?: { instituteCode: string; temporaryPassword: string };
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Action failed.");
        return;
      }
      if (json.data?.institute) {
        setInstitute(json.data.institute);
        setMessage(
          `Institute ${json.data.institute.status === "active" ? "activated" : "suspended"}.`
        );
      }
      if (json.data?.reset) {
        setResetPassword(json.data.reset.temporaryPassword);
        setMessage("Access reset. Share the one-time temporary password securely.");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3.5 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3.5 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}
      {resetPassword && (
        <div className="bg-warning-soft rounded-xl border border-amber-200 p-4 font-mono text-sm">
          New Temporary Password:{" "}
          <span className="text-foreground font-bold">{resetPassword}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Institute Profile &amp; Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Institute Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Owner Name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Input label="Email (Read-Only)" value={institute.email} disabled />
              </div>
              <Input
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="Admission Fee (₹)"
                  type="number"
                  min="0"
                  value={admissionFeeRupees}
                  onChange={(e) => setAdmissionFeeRupees(e.target.value)}
                />
                <Input
                  label="Profile Update (₹)"
                  type="number"
                  min="0"
                  value={profileUpdateFeeRupees}
                  onChange={(e) => setProfileUpdateFeeRupees(e.target.value)}
                />
                <Input
                  label="Certificate Fee (₹)"
                  type="number"
                  min="0"
                  value={certificateFeeRupees}
                  onChange={(e) => setCertificateFeeRupees(e.target.value)}
                />
              </div>
              <Button type="submit" loading={loading}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Access &amp; Wallet</CardTitle>
              <Badge variant={institute.status === "active" ? "success" : "danger"}>
                {institute.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border bg-surface rounded-xl border p-4">
              <p className="text-muted text-xs">Current Wallet Balance</p>
              <p className="text-foreground mt-1 text-2xl font-bold">
                ₹{(institute.walletBalancePaise / 100).toFixed(2)}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {institute.status === "active" ? (
                <Button
                  variant="destructive"
                  loading={loading}
                  leftIcon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => runAction("suspend")}
                >
                  Suspend Institute &amp; Revoke Sessions
                </Button>
              ) : (
                <Button
                  variant="primary"
                  loading={loading}
                  onClick={() => runAction("activate")}
                >
                  Activate Institute
                </Button>
              )}
              <Button
                variant="outline"
                loading={loading}
                leftIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                onClick={() => runAction("reset_access")}
              >
                Reset Admin Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted text-sm">No wallet transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border text-muted border-b text-xs font-semibold uppercase">
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 pr-4">Type</th>
                    <th className="py-2.5 pr-4">Reason</th>
                    <th className="py-2.5 pr-4">Amount</th>
                    <th className="py-2.5">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-muted py-2.5 pr-4 font-mono text-xs">
                        {tx.createdAt.slice(0, 10)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={tx.type === "credit" ? "success" : "warning"}>
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="text-foreground py-2.5 pr-4">{tx.reason}</td>
                      <td className="py-2.5 pr-4 font-medium">
                        ₹{(tx.amountPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 font-medium">
                        ₹{(tx.balanceAfterPaise / 100).toFixed(2)}
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
  );
}
