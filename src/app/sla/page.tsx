import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { getLegalDocument } from "@/config/legal";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Service Level & Support Policy (SLA)",
  description: `99.9% uptime commitment, incident severity response targets, and maintenance policy for ${siteConfig.name}.`,
  path: "/sla",
});

export default function SlaPage() {
  const doc = getLegalDocument("sla");
  if (!doc) notFound();
  return <LegalDocumentView doc={doc} />;
}
