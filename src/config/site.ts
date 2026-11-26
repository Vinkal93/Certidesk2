import type { SiteConfig } from "@/types/site";

export const siteConfig: SiteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "CertiDesk",
  tagline: "Modern Institute Management Platform",
  description:
    "Unified SaaS platform for educational and training institutes to manage student admissions, batches, attendance, fees, examinations, marksheets, certificates, and institutional reports.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
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
