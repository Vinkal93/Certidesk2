import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { SplitAuthLayout } from "@/features/auth/components/split-auth-layout";
import { PortalLoginForm } from "@/features/auth/components/portal-login-form";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "Student Login",
  "Sign in to your CertiDesk Pro Student Portal with your Student ID."
);

export default async function StudentDedicatedLoginPage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (user?.role === "student") {
    redirect("/student/dashboard");
  }

  return (
    <SplitAuthLayout>
      <div className="space-y-4">
        <Link
          href="/login"
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Change Portal
        </Link>
        <PortalLoginForm
          portal="student"
          badgeLabel="Student Portal"
          title="Welcome back!"
          description="Use the Student ID and password issued by your institute to view your fees, receipts, marksheets, and certificates."
        />
        <p className="text-muted text-center text-xs">
          Need help accessing your student account? Contact your institute administrator
          or{" "}
          <Link href="/contact" className="text-primary font-medium hover:underline">
            support
          </Link>
          .
        </p>
      </div>
    </SplitAuthLayout>
  );
}
