import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { getLegalDocument } from "@/config/legal";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Cookie & Local Storage Policy",
  description: `Details on strictly necessary HTTP-only session cookies and PWA offline storage used by ${siteConfig.name}.`,
  path: "/cookie-policy",
});

export default function CookiePolicyPage() {
  const doc = getLegalDocument("cookie-policy");
  if (!doc) notFound();
  return <LegalDocumentView doc={doc} />;
}
