import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { getLegalDocument } from "@/config/legal";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Data Processing Addendum (DPA)",
  description: `Enterprise Data Processing Addendum for registered institutes using ${siteConfig.name} under the DPDP Act 2023.`,
  path: "/dpa",
});

export default function DpaPage() {
  const doc = getLegalDocument("dpa");
  if (!doc) notFound();
  return <LegalDocumentView doc={doc} />;
}
