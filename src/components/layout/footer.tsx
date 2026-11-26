import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { Logo } from "./logo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border bg-surface text-foreground border-t">
      <Container className="py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="text-muted mt-4 max-w-sm text-sm leading-relaxed">
              {siteConfig.description}
            </p>
            <p className="text-muted mt-4 text-xs">
              Support:{" "}
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                {siteConfig.supportEmail}
              </a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {siteConfig.footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-foreground text-xs font-semibold tracking-wider uppercase">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-muted hover:text-foreground text-sm transition-colors duration-150"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-10" />

        <div className="text-muted flex flex-col items-start justify-between gap-4 text-xs sm:flex-row sm:items-center">
          <p>
            &copy; {currentYear} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
