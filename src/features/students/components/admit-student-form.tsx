"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdmittedCredentials {
  studentId: string;
  fullName: string;
  studentCode: string;
  loginEmail: string;
  temporaryPassword: string;
}

export function AdmitStudentForm({
  admissionFeePaise,
  walletBalancePaise,
}: {
  admissionFeePaise: number;
  walletBalancePaise: number;
}) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [guardianName, setGuardianName] = React.useState("");
  const [guardianPhone, setGuardianPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [admissionDate, setAdmissionDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [courseName, setCourseName] = React.useState("");
  const [batchName, setBatchName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [admitted, setAdmitted] = React.useState<AdmittedCredentials | null>(null);
  const [copied, setCopied] = React.useState(false);

  const insufficientBalance = walletBalancePaise < admissionFeePaise;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/institute/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          guardianName,
          guardianPhone,
          address,
          admissionDate,
          courseName,
          batchName,
        }),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            data: {
              student: { id: string; fullName: string };
              credentials: {
                studentCode: string;
                loginEmail: string;
                temporaryPassword: string;
              };
            };
          }
        | {
            ok: false;
            error?: {
              code?: string;
              message?: string;
              details?: {
                requiredPaise?: number;
                availablePaise?: number;
                shortfallPaise?: number;
              };
            };
          };

      if (!res.ok || !json.ok) {
        if (
          !json.ok &&
          json.error?.code === "INSUFFICIENT_WALLET_BALANCE" &&
          json.error.details
        ) {
          const d = json.error.details;
          setError(
            `Insufficient wallet balance. Required ₹${((d.requiredPaise ?? 0) / 100).toFixed(2)}, Available ₹${((d.availablePaise ?? 0) / 100).toFixed(2)}, Shortfall ₹${((d.shortfallPaise ?? 0) / 100).toFixed(2)}. Please recharge your wallet.`
          );
        } else {
          setError(
            !json.ok
              ? (json.error?.message ?? "Failed to admit student.")
              : "Failed to admit student."
          );
        }
        return;
      }

      setAdmitted({
        studentId: json.data.student.id,
        fullName: json.data.student.fullName,
        ...json.data.credentials,
      });
    } catch {
      setError("Network error while admitting student.");
    } finally {
      setLoading(false);
    }
  };

  if (admitted) {
    return (
      <Card elevated>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-success h-5 w-5" aria-hidden="true" />
            <Badge variant="success">Admission Complete</Badge>
          </div>
          <CardTitle className="mt-2">
            Student Credentials — {admitted.fullName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted text-sm">
            Share these credentials with the student. They will be prompted to change
            their password on first login.
          </p>
          <div className="border-border bg-surface space-y-2 rounded-xl border p-4 font-mono text-sm">
            <div>
              <span className="text-muted">Student ID: </span>
              <span className="text-foreground font-semibold">
                {admitted.studentCode}
              </span>
            </div>
            <div>
              <span className="text-muted">Email: </span>
              <span className="text-foreground font-semibold">{admitted.loginEmail}</span>
            </div>
            <div>
              <span className="text-muted">Temporary Password: </span>
              <span className="text-foreground font-semibold">
                {admitted.temporaryPassword}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              leftIcon={<Copy className="h-4 w-4" aria-hidden="true" />}
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `Student ID: ${admitted.studentCode}\nPassword: ${admitted.temporaryPassword}`
                );
                setCopied(true);
              }}
            >
              {copied ? "Copied!" : "Copy Credentials"}
            </Button>
            <Link
              href={`/institute/students/${admitted.studentId}`}
              className={buttonVariants({ variant: "primary" })}
            >
              View Student Profile
            </Link>
            <Link
              href="/institute/students"
              className={buttonVariants({ variant: "ghost" })}
            >
              Back to Students
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevated>
      <CardContent className="pt-6">
        <div className="border-border bg-surface mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4 text-sm">
          <div>
            <span className="text-muted">Admission Charge: </span>
            <span className="text-foreground font-semibold">
              ₹{(admissionFeePaise / 100).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-muted">Wallet Balance: </span>
            <span
              className={
                insufficientBalance
                  ? "text-danger font-semibold"
                  : "text-success font-semibold"
              }
            >
              ₹{(walletBalancePaise / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {insufficientBalance && (
          <div className="bg-danger-soft text-danger mb-5 flex flex-col justify-between gap-3 rounded-lg border border-red-200 p-4 text-sm sm:flex-row sm:items-center">
            <span>
              Insufficient wallet balance to admit a new student. Please recharge your
              wallet first.
            </span>
            <Link
              href="/institute/wallet"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              Recharge Wallet
            </Link>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="bg-danger-soft text-danger mb-5 flex items-start gap-2 rounded-lg border border-red-200 p-3.5 text-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Ananya Iyer"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Student Email"
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Guardian Name"
              placeholder="e.g. Suresh Iyer"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />
            <Input
              label="Guardian Phone"
              placeholder="+91 98765 00000"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Address"
              placeholder="City, State"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Input
              label="Admission Date"
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Course Name"
              placeholder="e.g. Diploma in Python"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
            />
            <Input
              label="Batch Name"
              placeholder="e.g. Morning Batch A"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            disabled={insufficientBalance}
          >
            Admit Student &amp; Deduct ₹{(admissionFeePaise / 100).toFixed(2)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
