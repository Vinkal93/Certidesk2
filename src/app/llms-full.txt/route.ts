import { siteConfig } from "@/config/site";
import { TOPICAL_SEO_PAGES } from "@/config/topical-seo";

export const dynamic = "force-static";

export function GET() {
  const base = siteConfig.url;
  const topicLines = TOPICAL_SEO_PAGES.map(
    (p) => `### ${p.title}\nURL: ${base}/${p.slug}\n${p.metaDescription}\n`
  ).join("\n");

  const content = `# ${siteConfig.name} — Complete Public Product Overview

${siteConfig.description}

## Target Audience
- Computer & IT Training Institutes (DCA, ADCA, Tally, Coding)
- Coaching Centres & Skill Academies
- Schools & Vocational Training Institutes

## Key Workflows
1. Institute Onboarding & Course/Batch Setup
2. Student Admission with Instant Credentials & Prepaid Wallet Deduction
3. Daily Attendance, Fee Collection, Receipts & Double-Entry Accounting
4. Online MCQ Exams, Subject-Wise Marks Entry & Result Declaration
5. Template-Driven PDF Marksheet & QR-Verified Certificate Issuance

## Topical Guides
${topicLines}

## Official Contact
- Email: ${siteConfig.supportEmail}
- Contact Page: ${base}/contact
- Download Center: ${base}/download
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
