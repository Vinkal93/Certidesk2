"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstituteRecord } from "@/types/domain";
import type { InstituteSettingsRecord } from "@/services/institute-ops.service";

export function SettingsClient({
  institute,
  settings,
}: {
  institute: InstituteRecord;
  settings: InstituteSettingsRecord;
}) {
  const [name, setName] = React.useState(institute.name);
  const [phone, setPhone] = React.useState(institute.phone);
  const [address, setAddress] = React.useState(institute.address);
  const [studentIdPrefix, setStudentIdPrefix] = React.useState(settings.studentIdPrefix);
  const [certificateSignatoryName, setCertificateSignatoryName] = React.useState(
    settings.certificateSignatoryName
  );
  const [certificateSignatoryTitle, setCertificateSignatoryTitle] = React.useState(
    settings.certificateSignatoryTitle
  );
  const [academicYear, setAcademicYear] = React.useState(settings.academicYear);
  const [notifyOnAdmission, setNotifyOnAdmission] = React.useState(
    settings.notifyOnAdmission
  );
  const [notifyOnFeeDue, setNotifyOnFeeDue] = React.useState(settings.notifyOnFeeDue);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/institute/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          studentIdPrefix,
          certificateSignatoryName,
          certificateSignatoryTitle,
          academicYear,
          notifyOnAdmission,
          notifyOnFeeDue,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to update settings.");
        return;
      }
      setMessage("Institute settings saved.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardTitle>Institute Profile, Academic &amp; Branding Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3 text-sm"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Institute Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Contact Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <Input
              label="Campus Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Student ID Prefix"
                value={studentIdPrefix}
                onChange={(e) => setStudentIdPrefix(e.target.value)}
                required
              />
              <Input
                label="Academic Year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                required
              />
              <Input
                label="Certificate Signatory"
                value={certificateSignatoryName}
                onChange={(e) => setCertificateSignatoryName(e.target.value)}
                required
              />
            </div>
            <Input
              label="Signatory Title"
              value={certificateSignatoryTitle}
              onChange={(e) => setCertificateSignatoryTitle(e.target.value)}
              required
            />
            <div className="border-border space-y-2 border-t pt-3">
              <Checkbox
                label="Send in-app welcome notification on student admission"
                checked={notifyOnAdmission}
                onChange={(e) => setNotifyOnAdmission(e.target.checked)}
              />
              <Checkbox
                label="Flag upcoming fee due reminders"
                checked={notifyOnFeeDue}
                onChange={(e) => setNotifyOnFeeDue(e.target.checked)}
              />
            </div>
            <Button type="submit" loading={loading}>
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Platform Policy (Read-Only)</CardTitle>
        </CardHeader>
        <CardContent className="text-muted space-y-3 text-sm">
          <p className="text-xs">
            Platform pricing and merchant gateway settings are managed centrally by Super
            Admin.
          </p>
          <div className="border-border flex justify-between border-b pb-2">
            <span>Admission Charge</span>
            <span className="text-foreground font-semibold">
              ₹{(institute.pricing.admissionFeePaise / 100).toFixed(2)}
            </span>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <span>Profile Update Charge</span>
            <span className="text-foreground font-semibold">
              ₹{(institute.pricing.profileUpdateFeePaise / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Certificate Generation</span>
            <span className="text-foreground font-semibold">
              {institute.pricing.certificateFeePaise === 0
                ? "Included"
                : `₹${(institute.pricing.certificateFeePaise / 100).toFixed(2)}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
