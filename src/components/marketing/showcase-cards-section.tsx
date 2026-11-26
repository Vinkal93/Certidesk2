import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

const showcaseCards = [
  {
    title: "Verified Certification",
    href: "/verify/demo",
    bgClass: "bg-[#FF3B47] text-white",
    linkClass: "text-white/95 hover:text-white",
    illustration: (
      <svg viewBox="0 0 120 120" className="h-28 w-28 drop-shadow-md" aria-hidden="true">
        <defs>
          <linearGradient id="sealGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF7ED" />
            <stop offset="100%" stopColor="#FED7AA" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="58" r="34" fill="url(#sealGrad)" />
        <circle cx="64" cy="58" r="24" fill="#FFFFFF" opacity="0.85" />
        <path
          d="M52 58l8 8 16-16"
          fill="none"
          stroke="#FF3B47"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M50 86l-6 26 14-8 6 10V88z" fill="#FFE4E6" />
        <path d="M78 86l6 26-14-8-6 10V88z" fill="#FECDD3" />
      </svg>
    ),
  },
  {
    title: "Institute Administration",
    href: "/institute/login",
    bgClass: "bg-white text-slate-900 border border-slate-200",
    linkClass: "text-slate-900 hover:text-primary",
    illustration: (
      <svg viewBox="0 0 120 120" className="h-28 w-28 drop-shadow-md" aria-hidden="true">
        <defs>
          <linearGradient id="crownGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>
        <rect x="34" y="96" width="52" height="14" rx="7" fill="url(#crownGrad)" />
        <path d="M42 96c2-22 6-36 18-48 12 12 16 26 18 48z" fill="url(#crownGrad)" />
        <circle cx="60" cy="40" r="14" fill="url(#crownGrad)" />
        <path d="M46 28l6-12 8 7 8-7 6 12z" fill="#1E293B" />
      </svg>
    ),
  },
  {
    title: "Analytics & Tracking",
    href: "/get-started",
    bgClass: "bg-[#F5F6F8] text-slate-900 border border-slate-200/80",
    linkClass: "text-slate-900 hover:text-primary",
    illustration: (
      <svg viewBox="0 0 120 120" className="h-28 w-28 drop-shadow-md" aria-hidden="true">
        <rect x="22" y="68" width="16" height="36" rx="6" fill="#1E293B" />
        <rect x="46" y="48" width="16" height="56" rx="6" fill="#334155" />
        <rect x="70" y="28" width="16" height="76" rx="6" fill="#0F172A" />
        <circle cx="94" cy="34" r="10" fill="#EF4444" />
        <path
          d="M28 56L54 38L78 20"
          fill="none"
          stroke="#EF4444"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Smart Fee & Wallet",
    href: "/student/login",
    bgClass: "bg-[#2B7FFF] text-white",
    linkClass: "text-white/95 hover:text-white",
    illustration: (
      <svg viewBox="0 0 120 120" className="h-28 w-28 drop-shadow-md" aria-hidden="true">
        <rect
          x="26"
          y="34"
          width="66"
          height="74"
          rx="10"
          fill="#FFFBEB"
          transform="rotate(-6 59 71)"
        />
        <path
          d="M42 66l14-14 10 10 14-14"
          fill="none"
          stroke="#64748B"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="52" cy="48" r="5" fill="#94A3B8" />
        <path d="M74 96L98 62l8 6-24 34-10 4z" fill="#D97706" />
      </svg>
    ),
  },
];

export function ShowcaseCardsSection() {
  return (
    <Section spacing="md" background="default">
      <Container>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {showcaseCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`group relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-2xl p-7 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md ${card.bgClass}`}
            >
              <h3 className="max-w-[70%] text-2xl font-bold tracking-tight">
                {card.title}
              </h3>
              <span
                className={`mt-10 inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase ${card.linkClass}`}
              >
                LEARN MORE
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="pointer-events-none absolute -right-2 -bottom-2">
                {card.illustration}
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  );
}
