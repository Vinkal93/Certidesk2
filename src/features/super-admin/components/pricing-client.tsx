"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  PlatformPricingConfig,
  PricingHistoryRecord,
} from "@/services/su-platform.service";

export function PricingClient({
  initialCurrent,
  initialHistory,
}: {
  initialCurrent: PlatformPricingConfig;
  initialHistory: PricingHistoryRecord[];
}) {
  const [admissionFeeRupees, setAdmissionFeeRupees] = React.useState(
    String(initialCurrent.admissionFeePaise / 100)
  );
  const [profileUpdateFeeRupees, setProfileUpdateFeeRupees] = React.useState(
    String(initialCurrent.profileUpdateFeePaise / 100)
  );
  const [certificateFeeRupees, setCertificateFeeRupees] = React.useState(
    String(initialCurrent.certificateFeePaise / 100)
  );
  const [effectiveDate, setEffectiveDate] = React.useState(initialCurrent.effectiveDate);
  const [history, setHistory] = React.useState(initialHistory);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/su/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionFeeRupees: Number(admissionFeeRupees),
          profileUpdateFeeRupees: Number(profileUpdateFeeRupees),
          certificateFeeRupees: Number(certificateFeeRupees),
          effectiveDate,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { pricing: PlatformPricingConfig };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to update central pricing.");
        return;
      }
      setMessage("Central pricing updated. Historical transactions remain preserved.");
      setHistory((prev) => [
        {
          id: `local_${Date.now()}`,
          admissionFeePaise: json.data!.pricing.admissionFeePaise,
          profileUpdateFeePaise: json.data!.pricing.profileUpdateFeePaise,
          certificateFeePaise: json.data!.pricing.certificateFeePaise,
          effectiveDate: json.data!.pricing.effectiveDate,
          actorUid: json.data!.pricing.updatedByUid,
          createdAt: json.data!.pricing.updatedAt,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Central Platform Pricing (Integer Paise)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="New Student Admission Fee (₹)"
              type="number"
              min="0"
              value={admissionFeeRupees}
              onChange={(e) => setAdmissionFeeRupees(e.target.value)}
              required
            />
            <Input
              label="Chargeable Profile Update Fee (₹)"
              type="number"
              min="0"
              value={profileUpdateFeeRupees}
              onChange={(e) => setProfileUpdateFeeRupees(e.target.value)}
              required
            />
            <Input
              label="Certificate Generation Fee (₹)"
              type="number"
              min="0"
              value={certificateFeeRupees}
              onChange={(e) => setCertificateFeeRupees(e.target.value)}
              helperText="Default ₹0 (Included)."
              required
            />
            <Input
              label="Effective Date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={loading}>
              Save Central Pricing
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle>Pricing Change History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted text-sm">No pricing changes recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-border text-muted border-b uppercase">
                    <th className="py-2 pr-4">Effective</th>
                    <th className="py-2 pr-4">Admission</th>
                    <th className="py-2 pr-4">Profile Edit</th>
                    <th className="py-2">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-border/70 divide-y">
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="py-2.5 pr-4 font-mono">{h.effectiveDate}</td>
                      <td className="py-2.5 pr-4">
                        ₹{(h.admissionFeePaise / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-4">
                        ₹{(h.profileUpdateFeePaise / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5">
                        ₹{(h.certificateFeePaise / 100).toFixed(2)}
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
