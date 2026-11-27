import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/security/session";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { SplitAuthLayout } from "@/features/auth/components/split-auth-layout";
import { PortalLoginForm } from "@/features/auth/components/portal-login-form";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "Institute Login",
  "Sign in to your CertiDesk Pro Institute Admin portal using Institute ID, email, or mobile number."
);

export default async function InstituteDedicatedLoginPage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (user?.role === "institute_admin" || user?.role === "staff") {
    redirect("/institute/dashboard");
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
          portal="institute"
          badgeLabel="Institute Administration"
          title="Welcome back!"
          description="Enter your Institute ID, registered owner email, or registered mobile number along with your password."
        />
        <p className="text-muted text-center text-xs">
          New institute?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Self-register here
          </Link>
        </p>
      </div>
    </SplitAuthLayout>
  );
}
