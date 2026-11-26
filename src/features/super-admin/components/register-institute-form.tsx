"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CreatedCredentials {
  instituteId: string;
  instituteName: string;
  instituteCode: string;
  loginEmail: string;
  temporaryPassword: string;
}

export function RegisterInstituteForm() {
  const [name, setName] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [passwordMode, setPasswordMode] = React.useState<"auto" | "manual">("auto");
  const [manualPassword, setManualPassword] = React.useState("");
  const [initialWalletRupees, setInitialWalletRupees] = React.useState("0");
  const [admissionFeeRupees, setAdmissionFeeRupees] = React.useState("150");
  const [profileUpdateFeeRupees, setProfileUpdateFeeRupees] = React.useState("100");
  const [certificateFeeRupees, setCertificateFeeRupees] = React.useState("0");
  const [status, setStatus] = React.useState<"active" | "suspended">("active");

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [created, setCreated] = React.useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/su/institutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ownerName,
          phone,
          email,
          address,
          passwordMode,
          manualPassword: passwordMode === "manual" ? manualPassword : undefined,
          initialWalletRupees: Number(initialWalletRupees),
          admissionFeeRupees: Number(admissionFeeRupees),
          profileUpdateFeeRupees: Number(profileUpdateFeeRupees),
          certificateFeeRupees: Number(certificateFeeRupees),
          status,
        }),
      });

      const json = (await res.json()) as
        | {
            ok: true;
            data: {
              institute: { id: string; name: string };
              credentials: {
                instituteCode: string;
                loginEmail: string;
                temporaryPassword: string;
              };
            };
          }
        | { ok: false; error?: { message?: string } };

      if (!res.ok || !json.ok) {
        setError(
          !json.ok
            ? (json.error?.message ?? "Failed to register institute.")
            : "Failed to register institute."
        );
        return;
      }

      setCreated({
        instituteId: json.data.institute.id,
        instituteName: json.data.institute.name,
        ...json.data.credentials,
      });
    } catch {
      setError("Network error while registering institute.");
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <Card elevated>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-success h-5 w-5" aria-hidden="true" />
            <Badge variant="success">Institute Provisioned</Badge>
          </div>
          <CardTitle className="mt-2">
            One-Time Credential Handoff — {created.instituteName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted text-sm">
            Copy these credentials now. The temporary password is not stored in Firestore
            and will not be shown again.
          </p>

          <div className="border-border bg-surface space-y-2 rounded-xl border p-4 font-mono text-sm">
            <div>
              <span className="text-muted">Institute ID: </span>
              <span className="text-foreground font-semibold">
                {created.instituteCode}
              </span>
            </div>
            <div>
              <span className="text-muted">Admin Email: </span>
              <span className="text-foreground font-semibold">{created.loginEmail}</span>
            </div>
            <div>
              <span className="text-muted">Temporary Password: </span>
              <span className="text-foreground font-semibold">
                {created.temporaryPassword}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              leftIcon={<Copy className="h-4 w-4" aria-hidden="true" />}
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `Institute ID: ${created.instituteCode}\nEmail: ${created.loginEmail}\nPassword: ${created.temporaryPassword}`
                );
                setCopied(true);
              }}
            >
              {copied ? "Copied!" : "Copy Credentials"}
            </Button>
            <Link
              href={`/su/institutes/${created.instituteId}`}
              className={buttonVariants({ variant: "primary" })}
            >
              Open Institute Profile
            </Link>
            <Link href="/su/institutes" className={buttonVariants({ variant: "ghost" })}>
              Back to Directory
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevated>
      <CardContent className="pt-6">
        {error && (
          <div
            role="alert"
            className="bg-danger-soft text-danger mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 p-3.5 text-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Institute Name"
              placeholder="e.g. Apex Technical Academy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Owner Name"
              placeholder="e.g. Rajesh Verma"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Phone"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Owner / Admin Email"
              type="email"
              placeholder="director@institute.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Input
            label="Campus Address"
            placeholder="Street, City, State, Postal Code"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select
              label="Credential Setup"
              value={passwordMode}
              onChange={(e) => setPasswordMode(e.target.value as "auto" | "manual")}
              options={[
                { label: "Auto-generate secure temporary password", value: "auto" },
                { label: "Set initial password manually", value: "manual" },
              ]}
            />
            <Select
              label="Initial Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "suspended")}
              options={[
                { label: "Active", value: "active" },
                { label: "Suspended", value: "suspended" },
              ]}
            />
          </div>

          {passwordMode === "manual" && (
            <Input
              label="Initial Password (min 8 characters)"
              type="password"
              value={manualPassword}
              onChange={(e) => setManualPassword(e.target.value)}
              required
            />
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <Input
              label="Initial Wallet (₹)"
              type="number"
              min="0"
              value={initialWalletRupees}
              onChange={(e) => setInitialWalletRupees(e.target.value)}
            />
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

          <Button type="submit" size="lg" fullWidth loading={loading}>
            Provision Institute &amp; Generate Credentials
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
