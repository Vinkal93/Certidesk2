import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Quote } from "lucide-react";

interface SplitAuthLayoutProps {
  children: React.ReactNode;
}

export function SplitAuthLayout({ children }: SplitAuthLayoutProps) {
  return (
    <div className="bg-background min-h-[calc(100vh-4rem)] px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[640px] max-w-6xl grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Left Sidebar Portrait Card (shown below form on mobile) */}
        <div className="relative order-2 min-h-[340px] overflow-hidden rounded-3xl bg-slate-950 shadow-xl lg:order-1 lg:col-span-5 lg:min-h-[640px]">
          <Image
            src="/images/founder-login.jpg"
            alt="Vinkal Prajapati — Founder, CertiDesk Pro"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover object-top"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-slate-950/15"
          />

          {/* Top-left Quote Badge */}
          <div className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950 shadow-md">
            <Quote className="h-4 w-4 fill-current" aria-hidden="true" />
          </div>

          {/* Bottom Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <span>certidesk.sbci.online</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>

            <p className="text-sm leading-relaxed font-medium text-white/95 sm:text-base">
              &ldquo;CertiDesk Pro streamlines institute admissions, fees, online exams,
              and verified certificates in one unified platform.&rdquo;
            </p>
            <p className="mt-2.5 text-xs font-medium text-slate-300">
              Vinkal Prajapati — Founder, CertiDesk Pro
            </p>

            {/* Accent Bar */}
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/20">
              <div className="from-primary h-full w-2/5 rounded-full bg-gradient-to-r via-sky-400 to-indigo-400" />
            </div>
          </div>
        </div>

        {/* Right Form / Portal Selection Column (shown first on mobile) */}
        <div className="order-1 flex flex-col justify-center px-1 py-2 sm:px-4 lg:order-2 lg:col-span-7 lg:px-8">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
