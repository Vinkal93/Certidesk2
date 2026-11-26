"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  IndianRupee,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  User,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  instituteNavGroups,
  instituteRouteTitles,
  type InstituteNavIcon,
} from "@/config/institute-nav";
import { hasStaffPermission } from "@/lib/security/permissions";
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { Logo } from "@/components/layout/logo";
import { SidebarMenu, type SidebarMenuGroup } from "@/components/portal/sidebar-menu";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import type { SessionUser } from "@/types/auth";

const iconComponents: Record<InstituteNavIcon, LucideIcon> = {
  layoutDashboard: LayoutDashboard,
  users: Users,
  bookOpen: BookOpen,
  layers: Layers,
  userCog: UserCog,
  calendarCheck: CalendarCheck,
  fileSpreadsheet: FileSpreadsheet,
  clipboardCheck: ClipboardCheck,
  award: Award,
  indianRupee: IndianRupee,
  wallet: Wallet,
  barChart3: BarChart3,
  messageSquare: MessageSquare,
  settings: Settings,
};

export interface InstituteShellProps {
  user: SessionUser;
  institute: {
    id: string;
    name: string;
    code: string;
    walletBalancePaise: number;
    admissionFeePaise: number;
  };
  children: React.ReactNode;
}

export function InstituteShell({ user, institute, children }: InstituteShellProps) {
  const pathname = usePathname() ?? "/institute/dashboard";
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loggingOut, setLoggingOut] = React.useState(false);

  const visibleGroups = React.useMemo(
    () =>
      instituteNavGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              !item.requiredPermission ||
              hasStaffPermission(user, item.requiredPermission)
          ),
        }))
        .filter((group) => group.items.length > 0),
    [user]
  );

  const menuGroups = React.useMemo<SidebarMenuGroup[]>(
    () =>
      visibleGroups.map((group) => ({
        title: group.title,
        items: group.items.map((item) => ({
          label: item.label,
          href: item.href,
          icon: iconComponents[item.icon],
        })),
      })),
    [visibleGroups]
  );

  const pageTitle = React.useMemo(() => {
    if (instituteRouteTitles[pathname]) {
      return instituteRouteTitles[pathname];
    }
    if (pathname.startsWith("/institute/students/")) {
      return "Student Details";
    }
    return "Institute Portal";
  }, [pathname]);

  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.slice(1).map((seg, idx) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href: "/institute/" + segments.slice(1, idx + 2).join("/"),
    }));
  }, [pathname]);

  const lowBalance = institute.walletBalancePaise < institute.admissionFeePaise * 2;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (isFirebaseClientConfigured()) {
        await signOut(getClientAuth()).catch(() => undefined);
      }
      router.replace("/institute/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/institute/students?search=${encodeURIComponent(q)}`);
    } else {
      router.push("/institute/students");
    }
  };

  const renderNavContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "border-border flex h-16 shrink-0 items-center border-b px-4",
          collapsed && !isMobile ? "justify-center" : "justify-between"
        )}
      >
        {(!collapsed || isMobile) && <Logo href="/institute/dashboard" />}
        {isMobile ? (
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Close navigation drawer"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="border-border bg-background text-muted hover:bg-surface hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <SidebarMenu
        groups={menuGroups}
        pathname={pathname}
        collapsed={collapsed}
        isMobile={isMobile}
        ariaLabel="Institute sidebar navigation"
        onNavigate={() => setMobileOpen(false)}
        isItemActive={(href, currentPath) =>
          currentPath === href ||
          (href !== "/institute/dashboard" && currentPath.startsWith(`${href}/`))
        }
      />

      {(!collapsed || isMobile) && (
        <div className="border-border border-t p-3">
          <div className="border-border bg-surface rounded-lg border p-3">
            <p className="text-foreground truncate text-xs font-semibold">
              {institute.name}
            </p>
            <div className="text-muted mt-1 flex items-center justify-between text-[11px]">
              <span className="font-mono">{institute.code}</span>
              <span className="text-foreground font-semibold">
                ₹{(institute.walletBalancePaise / 100).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-surface text-foreground flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "border-border bg-background hidden shrink-0 border-r transition-all duration-200 lg:block",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div className="sticky top-0 h-screen">{renderNavContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="border-border bg-background relative z-10 h-full w-72 border-r shadow-xl">
            {renderNavContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="border-border bg-background/95 sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="Open navigation menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </IconButton>
            </div>
            <div className="min-w-0">
              <h1 className="text-foreground truncate text-base font-semibold sm:text-lg">
                {pageTitle}
              </h1>
              <nav
                aria-label="Breadcrumb"
                className="text-muted hidden items-center gap-1 text-xs sm:flex"
              >
                <span>{institute.code}</span>
                {breadcrumbs.map((crumb) => (
                  <React.Fragment key={crumb.href}>
                    <span>/</span>
                    <Link href={crumb.href} className="hover:text-foreground">
                      {crumb.label}
                    </Link>
                  </React.Fragment>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <Search
                  className="text-muted pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  placeholder="Search students..."
                  aria-label="Search students"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-border bg-surface text-foreground placeholder:text-muted focus-visible:outline-primary h-9 w-52 rounded-lg border pr-3 pl-8 text-xs focus-visible:outline-2"
                />
              </div>
            </form>

            {/* Notifications */}
            <div className="relative">
              <IconButton
                variant="outline"
                size="sm"
                aria-label="Notifications"
                onClick={() => {
                  setNotificationsOpen((p) => !p);
                  setProfileOpen(false);
                }}
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
              </IconButton>
              {lowBalance && (
                <span
                  aria-hidden="true"
                  className="bg-warning ring-background absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2"
                />
              )}

              {notificationsOpen && (
                <div className="border-border bg-background absolute right-0 mt-2 w-72 rounded-xl border p-3 shadow-lg">
                  <p className="border-border text-foreground border-b pb-2 text-xs font-semibold">
                    Institute Alerts
                  </p>
                  <div className="mt-2 space-y-2 text-xs">
                    {lowBalance ? (
                      <Link
                        href="/institute/wallet"
                        onClick={() => setNotificationsOpen(false)}
                        className="bg-warning-soft text-warning block rounded-lg border border-amber-200 p-2.5"
                      >
                        Low wallet balance (₹
                        {(institute.walletBalancePaise / 100).toFixed(2)}). Recharge to
                        avoid admission interruptions.
                      </Link>
                    ) : (
                      <p className="text-muted py-2">No urgent alerts right now.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((p) => !p);
                  setNotificationsOpen(false);
                }}
                className="border-border bg-background text-foreground hover:bg-surface flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
              >
                <span className="bg-navy flex h-6 w-6 items-center justify-center rounded-full text-white">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {user.email ?? institute.code}
                </span>
                <ChevronDown className="text-muted h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {profileOpen && (
                <div className="border-border bg-background absolute right-0 mt-2 w-56 rounded-xl border p-2 shadow-lg">
                  <div className="border-border border-b px-2.5 py-2">
                    <p className="text-foreground truncate text-xs font-semibold">
                      {institute.name}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {user.role}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs">
                    <Link
                      href="/institute/profile"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface block rounded-lg px-2.5 py-2"
                    >
                      Institute Profile
                    </Link>
                    <Link
                      href="/institute/settings"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface block rounded-lg px-2.5 py-2"
                    >
                      Account &amp; Institute Settings
                    </Link>
                    <button
                      type="button"
                      disabled={loggingOut}
                      onClick={handleLogout}
                      className="text-danger hover:bg-danger-soft flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      {loggingOut ? "Signing out..." : "Sign Out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
