import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { listGlobalCertificateTemplates } from "@/services/su-platform.service";
import { SuCertificatesClient } from "@/features/super-admin/components/su-certificates-client";

export const metadata: Metadata = {
  title: "Global Certificate Templates",
  robots: { index: false, follow: false },
};

export default async function SuCertificatesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/su");

  const templates = await listGlobalCertificateTemplates(user);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Global Certificate Templates
        </h2>
        <p className="text-muted text-sm">
          Manage platform certificate templates, versioning, and numbering prefixes.
        </p>
      </div>
      <SuCertificatesClient initialTemplates={templates} />
    </div>
  );
}
