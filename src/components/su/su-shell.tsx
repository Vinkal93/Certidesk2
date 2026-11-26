"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  BarChart3,
  Bell,
  Box,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  CreditCard,
  Database,
  FileBarChart,
  FileText,
  Flag,
  Gauge,
  HardDrive,
  KeyRound,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  Plug,
  Receipt,
  Repeat,
  RotateCcw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Siren,
  Sliders,
  Tag,
  TrendingUp,
  User,
  UserCheck,
  UserCog,
  Users,
  Wallet,
  Webhook,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { suNavGroups, suRouteTitles, type SuNavIcon } from "@/config/su-nav";
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import type { SessionUser } from "@/types/auth";

const iconMap: Record<SuNavIcon, LucideIcon> = {
  layoutDashboard: LayoutDashboard,
  barChart3: BarChart3,
  building2: Building2,
  userCheck: UserCheck,
  users: Users,
  userCog: UserCog,
  layers: Layers,
  repeat: Repeat,
  sliders: Sliders,
  tag: Tag,
  receipt: Receipt,
  creditCard: CreditCard,
  wallet: Wallet,
  arrowLeftRight: ArrowLeftRight,
  rotateCcw: RotateCcw,
  trendingUp: TrendingUp,
  gauge: Gauge,
  cpu: Cpu,
  bell: Bell,
  flag: Flag,
  box: Box,
  megaphone: Megaphone,
  settings: Settings,
  shield: Shield,
  logIn: LogIn,
  keyRound: KeyRound,
  lock: Lock,
  fileText: FileText,
  alertTriangle: AlertTriangle,
  siren: Siren,
  wrench: Wrench,
  shieldAlert: ShieldAlert,
  ban: Ban,
  lifeBuoy: LifeBuoy,
  activity: Activity,
  database: Database,
  server: Server,
  hardDrive: HardDrive,
  clock: Clock,
  plug: Plug,
  webhook: Webhook,
  mail: Mail,
  messageSquare: MessageSquare,
  fileBarChart: FileBarChart,
};

export function SuShell({
  user,
  alerts,
  children,
}: {
  user: SessionUser;
  alerts: { suspendedInstitutes: number; gatewayEnabled: boolean };
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/su/dashboard";
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loggingOut, setLoggingOut] = React.useState(false);

  const pageTitle = React.useMemo(() => {
    if (suRouteTitles[pathname]) return suRouteTitles[pathname];
    if (pathname.startsWith("/su/institutes/")) return "Institute Details";
    if (pathname.startsWith("/su/payments/")) return "Payment Details";
    return "Super Admin Control Center";
  }, [pathname]);

  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.slice(1).map((seg, idx) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href: "/su/" + segments.slice(1, idx + 2).join("/"),
    }));
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (isFirebaseClientConfigured()) {
        await signOut(getClientAuth()).catch(() => undefined);
      }
      router.replace("/su");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/su/institutes?search=${encodeURIComponent(q)}` : "/su/institutes");
  };

  const renderNav = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "border-border flex h-16 shrink-0 items-center border-b px-4",
          collapsed && !isMobile ? "justify-center" : "justify-between"
        )}
      >
        {(!collapsed || isMobile) && <Logo href="/su/dashboard" />}
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
            onClick={() => setCollapsed((p) => !p)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="border-border bg-background text-muted hover:bg-surface hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <nav
        aria-label="Super Admin navigation"
        className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
      >
        {suNavGroups.map((group) => (
          <div key={group.title}>
            {(!collapsed || isMobile) && (
              <p className="text-muted mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider uppercase">
                {group.title}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/su/dashboard" &&
                    item.href !== "/su/institutes" &&
                    item.href !== "/su/settings" &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      title={collapsed && !isMobile ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-navy text-white shadow-xs"
                          : "text-muted hover:bg-surface hover:text-foreground",
                        collapsed && !isMobile && "justify-center px-2"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive
                            ? "text-blue-300"
                            : "text-muted group-hover:text-foreground"
                        )}
                        aria-hidden="true"
                      />
                      {(!collapsed || isMobile) && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="bg-surface text-foreground flex min-h-screen">
      <aside
        className={cn(
          "border-border bg-background hidden shrink-0 border-r transition-all duration-200 lg:block",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div className="sticky top-0 h-screen">{renderNav(false)}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="border-border bg-background relative z-10 h-full w-72 border-r shadow-xl">
            {renderNav(true)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
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
                <span>Super Admin</span>
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
                  placeholder="Search institutes..."
                  aria-label="Search institutes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-border bg-surface text-foreground placeholder:text-muted focus-visible:outline-primary h-9 w-52 rounded-lg border pr-3 pl-8 text-xs focus-visible:outline-2"
                />
              </div>
            </form>

            <div className="relative">
              <IconButton
                variant="outline"
                size="sm"
                aria-label="Platform Notifications"
                onClick={() => {
                  setNotificationsOpen((p) => !p);
                  setProfileOpen(false);
                }}
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
              </IconButton>
              {(!alerts.gatewayEnabled || alerts.suspendedInstitutes > 0) && (
                <span
                  aria-hidden="true"
                  className="bg-warning ring-background absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2"
                />
              )}
              {notificationsOpen && (
                <div className="border-border bg-background absolute right-0 mt-2 w-72 rounded-xl border p-3 shadow-lg">
                  <p className="border-border text-foreground border-b pb-2 text-xs font-semibold">
                    Platform Alerts
                  </p>
                  <div className="mt-2 space-y-2 text-xs">
                    {!alerts.gatewayEnabled && (
                      <Link
                        href="/su/settings/payment-gateway/razorpay"
                        onClick={() => setNotificationsOpen(false)}
                        className="bg-warning-soft text-warning block rounded-lg border border-amber-200 p-2.5"
                      >
                        Razorpay gateway is currently disabled.
                      </Link>
                    )}
                    {alerts.suspendedInstitutes > 0 && (
                      <Link
                        href="/su/institutes"
                        onClick={() => setNotificationsOpen(false)}
                        className="border-border bg-surface text-foreground block rounded-lg border p-2.5"
                      >
                        {alerts.suspendedInstitutes} institute(s) currently suspended.
                      </Link>
                    )}
                    {alerts.gatewayEnabled && alerts.suspendedInstitutes === 0 && (
                      <p className="text-muted py-2">All platform systems nominal.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                <span className="hidden max-w-[130px] truncate sm:inline">
                  {user.email ?? "Super Admin"}
                </span>
                <ChevronDown className="text-muted h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {profileOpen && (
                <div className="border-border bg-background absolute right-0 mt-2 w-56 rounded-xl border p-2 shadow-lg">
                  <div className="border-border border-b px-2.5 py-2">
                    <p className="text-foreground truncate text-xs font-semibold">
                      {user.email ?? user.uid}
                    </p>
                    <Badge variant="navy" className="mt-1">
                      super_admin
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs">
                    <Link
                      href="/su/settings"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface block rounded-lg px-2.5 py-2"
                    >
                      Platform Settings
                    </Link>
                    <Link
                      href="/su/settings/security"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface block rounded-lg px-2.5 py-2"
                    >
                      Security &amp; Access
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
