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
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "CertiDesk Pro",
  tagline: "Institute & Certificate Management Software",
  description:
    "Manage institutes, students, academic records, examinations, marksheets, and verifiable certificates through one centralized prepaid SaaS platform.",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@certidesk.app",
  navigation: [
    { label: "Features", href: "/features" },
    { label: "Solutions", href: "/solutions/computer-institutes" },
    { label: "Pricing", href: "/pricing" },
    { label: "Download", href: "/download" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  footerGroups: [
    {
      title: "Platform",
      links: [
        { label: "All Features", href: "/features" },
        { label: "How It Works", href: "/how-it-works" },
        { label: "Pricing & Wallet", href: "/pricing" },
        { label: "Download App", href: "/download" },
        { label: "Security & Privacy", href: "/security" },
        { label: "FAQ", href: "/faq" },
      ],
    },
    {
      title: "Modules",
      links: [
        { label: "Student Management", href: "/features/student-management" },
        { label: "Institute Management", href: "/features/institute-management" },
        { label: "Certificate Generator", href: "/features/certificate-generator" },
        { label: "Marksheet Generator", href: "/features/marksheet-generator" },
        { label: "Attendance Management", href: "/features/attendance-management" },
        { label: "Fee Management", href: "/features/fee-management" },
        { label: "Batch Management", href: "/features/batch-management" },
        { label: "Staff Management", href: "/features/staff-management" },
        { label: "Prepaid Wallet", href: "/features/wallet" },
        { label: "Reports & Analytics", href: "/features/reports-analytics" },
      ],
    },
    {
      title: "Solutions",
      links: [
        { label: "Computer Institutes", href: "/solutions/computer-institutes" },
        { label: "Coaching Centres", href: "/solutions/coaching-centres" },
        { label: "Training Institutes", href: "/solutions/training-institutes" },
      ],
    },
    {
      title: "Company & Legal",
      links: [
        { label: "About CertiDesk Pro", href: "/about" },
        { label: "Resource Blog", href: "/blog" },
        { label: "Contact Sales", href: "/contact" },
        { label: "Register Institute", href: "/register" },
        { label: "Sign In", href: "/login" },
        { label: "Legal Center", href: "/legal" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Refund & Wallet Policy", href: "/refund-policy" },
        { label: "Data Processing (DPA)", href: "/dpa" },
      ],
    },
  ],
};
