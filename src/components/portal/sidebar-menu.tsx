"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

export interface SidebarSubmenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number | undefined;
}

export interface SidebarMenuGroup {
  title: string;
  items: SidebarSubmenuItem[];
}

export interface SidebarMenuProps {
  groups: SidebarMenuGroup[];
  pathname: string;
  collapsed: boolean;
  isMobile: boolean;
  ariaLabel: string;
  onNavigate?: () => void;
  isItemActive: (href: string, pathname: string) => boolean;
}

/**
 * Collapsible Menu + Submenu navigation for portal sidebars.
 * Automatically expands the menu containing the active route (and the first menu by default)
 * while allowing users to expand/collapse any menu section.
 */
export function SidebarMenu({
  groups,
  pathname,
  collapsed,
  isMobile,
  ariaLabel,
  onNavigate,
  isItemActive,
}: SidebarMenuProps) {
  const [toggled, setToggled] = React.useState<Record<string, boolean>>({});
  const showExpanded = !collapsed || isMobile;

  const toggleGroup = (title: string, currentlyOpen: boolean) => {
    setToggled((prev) => ({
      ...prev,
      [title]: !currentlyOpen,
    }));
  };

  return (
    <nav
      aria-label={ariaLabel}
      className="sidebar-scroll flex-1 space-y-2 overflow-y-auto px-2.5 py-3.5"
    >
      {groups.map((group, idx) => {
        const hasActiveItem = group.items.some((item) =>
          isItemActive(item.href, pathname)
        );
        const defaultOpen = hasActiveItem || idx === 0;
        const isOpen = showExpanded ? (toggled[group.title] ?? defaultOpen) : true;
        const GroupIcon = group.items[0]?.icon;

        return (
          <div key={group.title} className="space-y-1">
            {showExpanded && (
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleGroup(group.title, isOpen)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold tracking-wider uppercase transition-colors",
                  hasActiveItem
                    ? "bg-surface text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {GroupIcon && (
                    <GroupIcon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        hasActiveItem ? "text-primary" : "text-muted"
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{group.title}</span>
                </span>
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
              </button>
            )}

            {isOpen && (
              <ul
                className={cn(
                  "space-y-1",
                  showExpanded && "border-border ml-3 border-l pl-2.5"
                )}
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item.href, pathname);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (isMobile && onNavigate) {
                            onNavigate();
                          }
                        }}
                        title={!showExpanded ? item.label : undefined}
                        className={cn(
                          "group flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-primary-soft text-primary font-semibold"
                            : "text-muted hover:bg-surface hover:text-foreground font-medium",
                          !showExpanded && "justify-center px-2 py-2"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive
                                ? "text-primary"
                                : "text-muted group-hover:text-foreground"
                            )}
                            aria-hidden="true"
                          />
                          {showExpanded && <span className="truncate">{item.label}</span>}
                        </span>
                        {showExpanded &&
                          typeof item.badgeCount === "number" &&
                          item.badgeCount > 0 && (
                            <Badge variant="primary">{item.badgeCount}</Badge>
                          )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
