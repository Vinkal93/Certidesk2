"use client";

import { usePathname } from "next/navigation";

export function isPortalShellRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/institute/") && pathname !== "/institute/login") {
    return true;
  }
  if (pathname.startsWith("/student/") && pathname !== "/student/login") {
    return true;
  }
  // /su is the Super Admin login page; /su/* sub-routes use the Super Admin portal shell
  if (pathname.startsWith("/su/") && pathname !== "/su/login") {
    return true;
  }
  return false;
}

export function ConditionalMarketingChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPortalShellRoute(pathname)) {
    return null;
  }
  return <>{children}</>;
}
