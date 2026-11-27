import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { getLegalDocument } from "@/config/legal";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Refund, Cancellation & Wallet Policy",
  description: `Prepaid wallet recharge, Razorpay duplicate transaction reversal, and cancellation policy for ${siteConfig.name}.`,
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  const doc = getLegalDocument("refund-policy");
  if (!doc) notFound();
  return <LegalDocumentView doc={doc} />;
}
