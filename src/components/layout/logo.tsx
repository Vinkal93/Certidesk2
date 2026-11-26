import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

export interface LogoProps {
  href?: string;
  className?: string;
  inverted?: boolean;
}

export function Logo({ href = "/", className, inverted = false }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight focus-visible:rounded-md",
        inverted ? "text-white" : "text-foreground",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg shadow-xs",
          inverted ? "bg-primary text-white" : "bg-navy text-white"
        )}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 7.5L12 3.5L20 7.5L12 11.5L4 7.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M7 10.5V15.5C7 17.1569 9.23858 18.5 12 18.5C14.7614 18.5 17 17.1569 17 15.5V10.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M20 8V14" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
