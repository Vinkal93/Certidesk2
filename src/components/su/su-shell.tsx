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
import { SidebarMenu, type SidebarMenuGroup } from "@/components/portal/sidebar-menu";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
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
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<
    Array<{
      id: string;
      category: "institute" | "user" | "student" | "page";
      title: string;
      subtitle: string;
      href: string;
    }>
  >([]);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const menuGroups = React.useMemo<SidebarMenuGroup[]>(
    () =>
      suNavGroups.map((group) => ({
        title: group.title,
        items: group.items.map((item) => ({
          label: item.label,
          href: item.href,
          icon: iconMap[item.icon],
        })),
      })),
    []
  );

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

  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const trimmed = value.trim();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchOpen(true);
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/su/search?q=${encodeURIComponent(trimmed)}`);
        const json = (await res.json()) as {
          data?: {
            results?: Array<{
              id: string;
              category: "institute" | "user" | "student" | "page";
              title: string;
              subtitle: string;
              href: string;
            }>;
          };
        };
        if (res.ok && json.data?.results) {
          setSearchResults(json.data.results);
        }
      } catch {
        // Ignore transient search error
      } finally {
        setSearchLoading(false);
      }
    }, 200);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults[0]) {
      setSearchOpen(false);
      router.push(searchResults[0].href);
      return;
    }
    const q = searchQuery.trim();
    setSearchOpen(false);
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

      <SidebarMenu
        groups={menuGroups}
        pathname={pathname}
        collapsed={collapsed}
        isMobile={isMobile}
        ariaLabel="Super Admin navigation"
        onNavigate={() => setMobileOpen(false)}
        isItemActive={(href, currentPath) =>
          currentPath === href ||
          (href !== "/su/dashboard" &&
            href !== "/su/institutes" &&
            href !== "/su/settings" &&
            currentPath.startsWith(`${href}/`))
        }
      />
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

          <div className="flex items-center gap-2 sm:gap-3">
            <div ref={searchRef} className="relative">
              <form onSubmit={handleSearch} className="hidden md:block">
                <div className="relative">
                  <Search
                    className="text-muted pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Global search (Ctrl+K)..."
                    aria-label="Global search across institutes, users, students, and pages"
                    value={searchQuery}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="border-border bg-surface text-foreground placeholder:text-muted focus-visible:outline-primary h-9 w-56 rounded-lg border pr-3 pl-8 text-xs focus-visible:outline-2 lg:w-72"
                  />
                </div>
              </form>

              <div className="md:hidden">
                <IconButton
                  variant="outline"
                  size="sm"
                  aria-label="Global search"
                  onClick={() => setSearchOpen((p) => !p)}
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </div>

              {searchOpen && (
                <div className="border-border bg-background absolute right-0 z-50 mt-2 w-80 rounded-2xl border p-3 shadow-2xl sm:w-96">
                  <div className="mb-2 md:hidden">
                    <input
                      type="search"
                      placeholder="Search institutes, users, pages..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      autoFocus
                      className="border-border bg-surface text-foreground h-9 w-full rounded-lg border px-3 text-xs"
                    />
                  </div>
                  <div className="border-border flex items-center justify-between border-b pb-2 text-[11px]">
                    <span className="text-foreground font-semibold">
                      Global Platform Search
                    </span>
                    <span className="text-muted">Institutes · Users · Pages</span>
                  </div>
                  <div className="sidebar-scroll mt-2 max-h-72 space-y-1 overflow-y-auto">
                    {!searchQuery.trim() ? (
                      <p className="text-muted py-4 text-center text-xs">
                        Type an institute name, code, user email, student ID, or page...
                      </p>
                    ) : searchLoading ? (
                      <p className="text-muted py-4 text-center text-xs">
                        Searching platform...
                      </p>
                    ) : searchResults.length === 0 ? (
                      <p className="text-muted py-4 text-center text-xs">
                        No matching records found.
                      </p>
                    ) : (
                      searchResults.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setSearchOpen(false)}
                          className="hover:bg-surface flex items-start justify-between gap-2 rounded-xl px-2.5 py-2 text-xs transition"
                        >
                          <div className="min-w-0">
                            <p className="text-foreground truncate font-semibold">
                              {item.title}
                            </p>
                            <p className="text-muted truncate text-[11px]">
                              {item.subtitle}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 capitalize">
                            {item.category}
                          </Badge>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            <div ref={notificationsRef} className="relative">
              <IconButton
                variant="outline"
                size="sm"
                aria-label="Platform Notifications"
                aria-expanded={notificationsOpen}
                aria-haspopup="menu"
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
                <div className="border-border bg-background absolute right-0 z-50 mt-2 w-80 rounded-2xl border p-3.5 shadow-xl">
                  <div className="border-border flex items-center justify-between border-b pb-2.5">
                    <div>
                      <p className="text-foreground text-xs font-semibold">
                        Platform Notifications
                      </p>
                      <p className="text-muted text-[11px]">
                        Live operational status &amp; alerts
                      </p>
                    </div>
                    <Badge
                      variant={
                        !alerts.gatewayEnabled || alerts.suspendedInstitutes > 0
                          ? "warning"
                          : "success"
                      }
                    >
                      {(!alerts.gatewayEnabled ? 1 : 0) +
                        (alerts.suspendedInstitutes > 0 ? 1 : 0)}{" "}
                      alert(s)
                    </Badge>
                  </div>
                  <div className="mt-2.5 space-y-2 text-xs">
                    {!alerts.gatewayEnabled && (
                      <Link
                        href="/su/settings/payment-gateway/razorpay"
                        onClick={() => setNotificationsOpen(false)}
                        className="bg-warning-soft text-warning block rounded-xl border border-amber-200/80 p-2.5 transition hover:opacity-90"
                      >
                        <p className="font-semibold">Payment Gateway Disabled</p>
                        <p className="mt-0.5 text-[11px] opacity-90">
                          Razorpay wallet recharges are paused. Click to configure.
                        </p>
                      </Link>
                    )}
                    {alerts.suspendedInstitutes > 0 && (
                      <Link
                        href="/su/institutes?status=suspended"
                        onClick={() => setNotificationsOpen(false)}
                        className="border-border bg-surface text-foreground hover:bg-surface-2 block rounded-xl border p-2.5 transition"
                      >
                        <p className="font-semibold">
                          {alerts.suspendedInstitutes} Suspended Institute(s)
                        </p>
                        <p className="text-muted mt-0.5 text-[11px]">
                          Review institute compliance and billing status.
                        </p>
                      </Link>
                    )}
                    {alerts.gatewayEnabled && alerts.suspendedInstitutes === 0 && (
                      <div className="border-border bg-surface rounded-xl border p-3 text-center">
                        <p className="text-foreground font-medium">
                          All platform systems nominal
                        </p>
                        <p className="text-muted mt-0.5 text-[11px]">
                          Gateway active &bull; No suspended institutes
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="border-border mt-3 flex items-center justify-between border-t pt-2.5 text-[11px]">
                    <Link
                      href="/su/audit"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-primary font-medium hover:underline"
                    >
                      View Audit Logs
                    </Link>
                    <Link
                      href="/su/users"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-muted hover:text-foreground font-medium"
                    >
                      Manage Users &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setProfileOpen((p) => !p);
                  setNotificationsOpen(false);
                }}
                className="border-border bg-background text-foreground hover:bg-surface flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
              >
                <span className="bg-navy flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white">
                  {(user.email?.[0] ?? "S").toUpperCase()}
                </span>
                <span className="hidden max-w-[140px] truncate sm:inline">
                  {user.email ?? "Super Admin"}
                </span>
                <ChevronDown className="text-muted h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {profileOpen && (
                <div className="border-border bg-background absolute right-0 z-50 mt-2 w-68 rounded-2xl border p-2.5 shadow-xl">
                  <div className="border-border bg-surface rounded-xl border px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-navy flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                        {(user.email?.[0] ?? "S").toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-xs font-semibold">
                          {user.email ?? "Super Admin"}
                        </p>
                        <p className="text-muted truncate font-mono text-[10px]">
                          UID: {user.uid.slice(0, 12)}&hellip;
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="navy">super_admin</Badge>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Session Active
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs">
                    <Link
                      href="/su/users"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface flex items-center justify-between rounded-lg px-2.5 py-2 transition"
                    >
                      <span>All Users &amp; Access Control</span>
                    </Link>
                    <Link
                      href="/su/subscriptions"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface flex items-center justify-between rounded-lg px-2.5 py-2 transition"
                    >
                      <span>Monthly Subscriptions &amp; Fees</span>
                    </Link>
                    <Link
                      href="/su/settings"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface flex items-center justify-between rounded-lg px-2.5 py-2 transition"
                    >
                      <span>Platform Settings</span>
                    </Link>
                    <Link
                      href="/scan-login"
                      onClick={() => setProfileOpen(false)}
                      className="text-primary hover:bg-surface flex items-center justify-between rounded-lg px-2.5 py-2 font-semibold transition"
                    >
                      <span>Scan &amp; Login on PC</span>
                    </Link>
                    <Link
                      href="/su/settings/security"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface flex items-center justify-between rounded-lg px-2.5 py-2 transition"
                    >
                      <span>Security &amp; Sessions</span>
                    </Link>
                    <div className="border-border my-1 border-t" />
                    <button
                      type="button"
                      disabled={loggingOut}
                      onClick={handleLogout}
                      className="text-danger hover:bg-danger-soft flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium transition"
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

        <main
          id="main-content"
          className="portal-main min-w-0 flex-1 overflow-x-hidden p-3 sm:p-5 lg:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
