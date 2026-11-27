import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { getLegalDocument } from "@/config/legal";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Acceptable Use & Anti-Fraud Policy",
  description: `Acceptable Use, credential authenticity, and anti-fraud rules for ${siteConfig.name} institutes, staff, and students.`,
  path: "/acceptable-use",
});

export default function AcceptableUsePage() {
  const doc = getLegalDocument("acceptable-use");
  if (!doc) notFound();
  return <LegalDocumentView doc={doc} />;
}
