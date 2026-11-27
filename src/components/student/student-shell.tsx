"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Award,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  HelpCircle,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  studentNavGroups,
  studentRouteTitles,
  type StudentNavIcon,
} from "@/config/student-nav";
import { getClientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { Logo } from "@/components/layout/logo";
import { SidebarMenu, type SidebarMenuGroup } from "@/components/portal/sidebar-menu";
import { IconButton } from "@/components/ui/icon-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const iconMap: Record<StudentNavIcon, LucideIcon> = {
  layoutDashboard: LayoutDashboard,
  user: User,
  bookOpen: BookOpen,
  calendarCheck: CalendarCheck,
  fileSpreadsheet: FileSpreadsheet,
  checkSquare: CheckSquare,
  clipboardCheck: ClipboardCheck,
  award: Award,
  indianRupee: IndianRupee,
  receipt: Receipt,
  bell: Bell,
  settings: Settings,
  helpCircle: HelpCircle,
};

export function StudentShell({
  student,
  instituteName,
  unreadNotificationsCount,
  children,
}: {
  student: {
    id: string;
    studentCode: string;
    fullName: string;
    courseName: string;
    batchName: string;
  };
  instituteName: string;
  unreadNotificationsCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/student/dashboard";
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const menuGroups = React.useMemo<SidebarMenuGroup[]>(
    () =>
      studentNavGroups.map((group) => ({
        title: group.title,
        items: group.items.map((item) => ({
          label: item.label,
          href: item.href,
          icon: iconMap[item.icon],
          badgeCount:
            item.href === "/student/notifications" ? unreadNotificationsCount : undefined,
        })),
      })),
    [unreadNotificationsCount]
  );

  const pageTitle = studentRouteTitles[pathname] ?? "Student Portal";

  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.slice(1).map((seg, idx) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href: "/student/" + segments.slice(1, idx + 2).join("/"),
    }));
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (isFirebaseClientConfigured()) {
        await signOut(getClientAuth()).catch(() => undefined);
      }
      router.replace("/student/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const renderNav = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "border-border flex h-16 shrink-0 items-center border-b px-4",
          collapsed && !isMobile ? "justify-center" : "justify-between"
        )}
      >
        {(!collapsed || isMobile) && <Logo href="/student/dashboard" />}
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
        ariaLabel="Student sidebar navigation"
        onNavigate={() => setMobileOpen(false)}
        isItemActive={(href, currentPath) => currentPath === href}
      />

      {(!collapsed || isMobile) && (
        <div className="border-border border-t p-3">
          <div className="border-border bg-surface rounded-lg border p-3">
            <p className="text-foreground truncate text-xs font-semibold">
              {student.fullName}
            </p>
            <p className="text-muted truncate text-[11px]">{instituteName}</p>
            <p className="text-muted mt-0.5 font-mono text-[11px]">
              {student.studentCode}
            </p>
          </div>
        </div>
      )}
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
                <span>{instituteName}</span>
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
            <ThemeToggle />

            <Link
              href="/student/notifications"
              className="border-border bg-background text-foreground hover:bg-surface relative inline-flex h-9 w-9 items-center justify-center rounded-lg border"
              aria-label={`Notifications (${unreadNotificationsCount} unread)`}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadNotificationsCount > 0 && (
                <span className="bg-primary ring-background absolute -top-1.5 -right-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2">
                  {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                </span>
              )}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((p) => !p)}
                className="border-border bg-background text-foreground hover:bg-surface flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
              >
                <span className="bg-navy flex h-6 w-6 items-center justify-center rounded-full text-white">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="hidden max-w-[130px] truncate sm:inline">
                  {student.fullName}
                </span>
                <ChevronDown className="text-muted h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {profileOpen && (
                <div className="border-border bg-background absolute right-0 mt-2 w-56 rounded-xl border p-2 shadow-lg">
                  <div className="border-border border-b px-2.5 py-2">
                    <p className="text-foreground truncate text-xs font-semibold">
                      {student.fullName}
                    </p>
                    <p className="text-muted font-mono text-[11px]">
                      {student.studentCode}
                    </p>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs">
                    <Link
                      href="/student/profile"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface block rounded-lg px-2.5 py-2"
                    >
                      My Profile
                    </Link>
                    <Link
                      href="/student/settings"
                      onClick={() => setProfileOpen(false)}
                      className="text-foreground hover:bg-surface block rounded-lg px-2.5 py-2"
                    >
                      Password &amp; Security
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
