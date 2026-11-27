import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { getLegalDocument } from "@/config/legal";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Terms of Service",
  description: `Master Terms of Service governing ${siteConfig.name} multi-tenant institute workspaces, prepaid wallet billing, and credential issuance.`,
  path: "/terms",
});

export default function TermsPage() {
  const doc = getLegalDocument("terms");
  if (!doc) notFound();
  return <LegalDocumentView doc={doc} />;
}
