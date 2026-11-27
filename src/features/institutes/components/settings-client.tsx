"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwError, setPwError] = React.useState<string | null>(null);
  const [pwMessage, setPwMessage] = React.useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwMessage(null);
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/institute/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setPwError(json.error?.message ?? "Failed to update password.");
        return;
      }
      setPwMessage(
        "Your login password has been updated. Use the new password next time you sign in."
      );
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwError("Network error while updating password.");
    } finally {
      setPwLoading(false);
    }
  };

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

      <div className="space-y-6 lg:col-span-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="text-primary h-4 w-4" aria-hidden="true" />
                Owner Account &amp; Password
              </CardTitle>
              <Badge variant={institute.status === "active" ? "success" : "danger"}>
                {institute.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border bg-surface space-y-1.5 rounded-xl border p-3 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted">Institute ID:</span>
                <span className="text-foreground font-semibold">{institute.code}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">Owner:</span>
                <span className="text-foreground font-semibold">
                  {institute.ownerName}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted">Login Email:</span>
                <span className="text-foreground font-semibold">{institute.email}</span>
              </div>
            </div>

            {pwError && (
              <div className="bg-danger-soft text-danger rounded-lg p-2.5 text-xs">
                {pwError}
              </div>
            )}
            {pwMessage && (
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                {pwMessage}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <Input
                label="New Login Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                minLength={6}
                required
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                fullWidth
                loading={pwLoading}
                leftIcon={<KeyRound className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Update My Password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Policy (Read-Only)</CardTitle>
          </CardHeader>
          <CardContent className="text-muted space-y-3 text-sm">
            <p className="text-xs">
              Platform pricing and merchant gateway settings are managed centrally by
              Super Admin.
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
    </div>
  );
}
