import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { getLegalDocument } from "@/config/legal";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Privacy Policy",
  description: `Official DPDP Act 2023 & IT Act 2000 Privacy Policy for ${siteConfig.name} institute, student, and credential verification platform.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  const doc = getLegalDocument("privacy");
  if (!doc) notFound();
  return <LegalDocumentView doc={doc} />;
}
