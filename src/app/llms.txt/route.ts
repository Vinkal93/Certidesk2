import { siteConfig } from "@/config/site";
import { distributionConfig } from "@/config/distribution";

export const dynamic = "force-static";

export function GET() {
  const base = siteConfig.url;
  const content = `# ${siteConfig.name}

> ${siteConfig.description}

## Product Identity
- Name: ${siteConfig.name}
- Category: Institute Management, Student Management, Fee Accounting & Digital Certification SaaS
- Latest App Version: ${distributionConfig.version} (PWA for Android, iOS, Windows, macOS, Linux, and Web)
- Support Contact: ${siteConfig.supportEmail}

## Core Capabilities
- Multi-tenant Institute Administration with role-based staff permissions
- Student Admission, unique Student IDs, and Student Self-Service Portal
- Course, Subject, and Seat-Capped Batch Management
- Double-Entry Student Fee Collection, Receipts, Refunds & Profit/Loss Accounting
- Online MCQ Examinations & Custom-Subject Marks Entry
- Precision PDF Marksheet & Certificate Studio with Public QR Verification
- Installable Progressive Web App (PWA) & QR Code Phone-to-PC Login

## Public Resources
- Home: ${base}/
- Download & Install Center: ${base}/download
- Features Overview: ${base}/features
- Pricing & Prepaid Wallet: ${base}/pricing
- How It Works: ${base}/how-it-works
- Security & Privacy: ${base}/security
- FAQ: ${base}/faq
- Blog: ${base}/blog
- Full Documentation Summary: ${base}/llms-full.txt
- Sitemap: ${base}/sitemap.xml
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
