import type { SiteConfig } from "@/types/site";

function normalizeSiteUrl(raw: string | undefined): string {
  if (!raw) return "http://localhost:3000";
  let cleaned = raw.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (!cleaned) return "http://localhost:3000";
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = `https://${cleaned}`;
  }
  try {
    return new URL(cleaned).toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

export const siteConfig: SiteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "CertiDesk",
  tagline: "Modern Institute Management Platform",
  description:
    "Unified SaaS platform for educational and training institutes to manage student admissions, batches, attendance, fees, examinations, marksheets, certificates, and institutional reports.",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@certidesk.app",
  navigation: [
    { label: "Features", href: "/#features" },
    { label: "Solutions", href: "/#solutions" },
    { label: "Pricing", href: "/#pricing" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  footerGroups: [
    {
      title: "Platform",
      links: [
        { label: "Core Features", href: "/#features" },
        { label: "Management Workflow", href: "/#workflow" },
        { label: "Product Preview", href: "/#preview" },
        { label: "Pricing Plans", href: "/#pricing" },
      ],
    },
    {
      title: "Modules",
      links: [
        { label: "Student Admissions", href: "/#student-management" },
        { label: "Fee & Dues Tracking", href: "/#fee-management" },
        { label: "Attendance Ledger", href: "/#attendance-management" },
        { label: "Exams & Marksheets", href: "/#examination-management" },
        { label: "Certificates", href: "/#certificate-management" },
      ],
    },
    {
      title: "Solutions",
      links: [
        { label: "Coaching Centers", href: "/#solutions" },
        { label: "Skill & Vocational Institutes", href: "/#solutions" },
        { label: "Computer Training Academies", href: "/#solutions" },
        { label: "Multi-Branch Networks", href: "/#solutions" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About CertiDesk", href: "/about" },
        { label: "Contact Sales", href: "/contact" },
        { label: "Get Started", href: "/get-started" },
        { label: "Sign In", href: "/sign-in" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
      ],
    },
  ],
};
