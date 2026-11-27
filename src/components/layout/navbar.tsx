"use client";

import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Logo } from "./logo";

export function Navbar() {
  const { isOpen, toggle, close } = useMobileMenu();

  return (
    <>
      <header className="border-border/80 bg-background/95 sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <Logo />

            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-7 lg:flex"
            >
              {siteConfig.navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-muted hover:text-foreground text-sm font-medium transition-colors duration-150"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <ThemeToggle />
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />
              <IconButton
                variant="ghost"
                size="md"
                aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isOpen}
                aria-controls="mobile-navigation-menu"
                onClick={toggle}
              >
                {isOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </IconButton>
            </div>
          </div>
        </Container>
      </header>

      {isOpen && (
        <div
          id="mobile-navigation-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm lg:hidden"
          onClick={close}
        >
          <div
            className="border-border bg-background max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-2xl border p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border flex items-center justify-between border-b pb-3.5">
              <Logo />
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="Close navigation menu"
                onClick={close}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </div>

            <nav aria-label="Mobile navigation" className="mt-3 flex flex-col gap-1">
              {siteConfig.navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="text-foreground hover:bg-surface rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="border-border mt-4 flex flex-col gap-2.5 border-t pt-4">
              <Link
                href="/login"
                onClick={close}
                className={buttonVariants({
                  variant: "outline",
                  size: "md",
                  fullWidth: true,
                })}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={close}
                className={buttonVariants({
                  variant: "primary",
                  size: "md",
                  fullWidth: true,
                })}
              >
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
