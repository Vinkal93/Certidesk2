"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  KeyRound,
  Send,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentRecord } from "@/types/domain";

export function StudentDetailClient({
  initialStudent,
  profileUpdateFeePaise,
}: {
  initialStudent: StudentRecord;
  profileUpdateFeePaise: number;
}) {
  const router = useRouter();
  const [student, setStudent] = React.useState(initialStudent);
  const [fullName, setFullName] = React.useState(initialStudent.fullName);
  const [phone, setPhone] = React.useState(initialStudent.phone);
  const [courseName, setCourseName] = React.useState(initialStudent.courseName);
  const [batchName, setBatchName] = React.useState(initialStudent.batchName);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [resetPass, setResetPass] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [msgCategory, setMsgCategory] = React.useState<
    "announcement" | "fee_reminder" | "exam_notice" | "urgent"
  >("announcement");
  const [msgTitle, setMsgTitle] = React.useState("");
  const [msgBody, setMsgBody] = React.useState("");
  const [sendingMsg, setSendingMsg] = React.useState(false);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/institute/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, courseName, batchName }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { student: StudentRecord };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? "Failed to update student.");
        return;
      }
      setStudent(json.data.student);
      setMessage("Student profile updated successfully.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: "activate" | "disable" | "reset_password") => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setResetPass(null);
    try {
      const res = await fetch(`/api/institute/students/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          student?: StudentRecord;
          reset?: { studentCode: string; temporaryPassword: string };
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Action failed.");
        return;
      }
      if (json.data?.student) {
        setStudent(json.data.student);
        setMessage(`Student account is now ${json.data.student.status}.`);
      }
      if (json.data?.reset) {
        setResetPass(json.data.reset.temporaryPassword);
        setMessage("Student password reset. Share the temporary password securely.");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/institute/students/${student.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to delete student.");
        return;
      }
      router.replace("/institute/students");
      router.refresh();
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSendingMsg(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/institute/students/${student.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: msgCategory,
          title: msgTitle,
          message: msgBody,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Failed to send message.");
        return;
      }
      setMsgTitle("");
      setMsgBody("");
      setMessage("Popup & notification message sent to student portal.");
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bg-danger-soft text-danger flex items-start gap-2 rounded-lg border border-red-200 p-3.5 text-sm dark:border-red-800/60"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-success-soft text-success flex items-start gap-2 rounded-lg border border-emerald-200 p-3.5 text-sm dark:border-emerald-800/60">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}
      {resetPass && (
        <div className="bg-warning-soft rounded-xl border border-amber-200 p-4 font-mono text-sm dark:border-amber-800/60">
          New Temporary Password:{" "}
          <span className="text-foreground font-bold">{resetPass}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>
              Student Profile (Update Fee: ₹{(profileUpdateFeePaise / 100).toFixed(2)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Email (Read-Only)" value={student.email} disabled />
                <Input
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Course Name"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
                <Input
                  label="Batch Name"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" loading={loading}>
                Update Profile (₹{(profileUpdateFeePaise / 100).toFixed(2)})
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Account Access</CardTitle>
              <Badge variant={student.status === "active" ? "success" : "danger"}>
                {student.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border bg-surface rounded-xl border p-4 font-mono text-xs">
              Student ID: <span className="font-semibold">{student.studentCode}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {student.status === "active" ? (
                <Button
                  variant="destructive"
                  loading={loading}
                  leftIcon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => runAction("disable")}
                >
                  Disable Student Account
                </Button>
              ) : (
                <Button
                  variant="primary"
                  loading={loading}
                  onClick={() => runAction("activate")}
                >
                  Activate Student Account
                </Button>
              )}
              <Button
                variant="outline"
                loading={loading}
                leftIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                onClick={() => runAction("reset_password")}
              >
                Reset Student Password
              </Button>
              {!confirmDelete ? (
                <Button
                  variant="outline"
                  loading={loading}
                  leftIcon={<Trash2 className="text-danger h-4 w-4" aria-hidden="true" />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete Student Permanently
                </Button>
              ) : (
                <div className="bg-danger-soft space-y-2 rounded-xl border border-red-200 p-3 dark:border-red-800/60">
                  <p className="text-danger text-xs font-semibold">
                    Confirm deleting {student.fullName} ({student.studentCode})?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      loading={loading}
                      onClick={() => void handleDelete()}
                    >
                      Yes, Delete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="text-primary h-4 w-4" aria-hidden="true" />
            Send Custom Popup &amp; Notification to {student.fullName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Message Category"
                value={msgCategory}
                onChange={(e) =>
                  setMsgCategory(
                    e.target.value as
                      "announcement" | "fee_reminder" | "exam_notice" | "urgent"
                  )
                }
                options={[
                  { label: "Announcement", value: "announcement" },
                  { label: "Fee Reminder", value: "fee_reminder" },
                  { label: "Exam Notice", value: "exam_notice" },
                  { label: "Urgent Alert", value: "urgent" },
                ]}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Popup / Notification Title"
                  placeholder="e.g. Monthly Fee Reminder or Document Verification"
                  value={msgTitle}
                  onChange={(e) => setMsgTitle(e.target.value)}
                  required
                />
              </div>
            </div>
            <Textarea
              label="Message Content"
              rows={3}
              placeholder="Write the message to display as a popup & notification in the student portal..."
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              required
            />
            <Button
              type="submit"
              loading={sendingMsg}
              leftIcon={<Send className="h-4 w-4" aria-hidden="true" />}
            >
              Send Popup &amp; Notification
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
