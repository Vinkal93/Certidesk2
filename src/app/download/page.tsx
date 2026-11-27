import type { Metadata } from "next";
import Link from "next/link";
import { distributionConfig } from "@/config/distribution";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
} from "@/components/seo/json-ld";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { DownloadCenterClient } from "@/features/download/components/download-center-client";

export const metadata: Metadata = buildPublicMetadata({
  title: "Download CertiDesk Pro | Install on Android, iOS, Windows, macOS & Linux",
  description:
    "Take CertiDesk Pro everywhere. Install our Progressive Web App on Android, iPhone, iPad, Windows, macOS, or Linux, or launch directly in your browser.",
  path: "/download",
  keywords: [
    "download CertiDesk Pro",
    "CertiDesk Pro app",
    "institute management app download",
    "CertiDesk PWA install",
  ],
});

export default function DownloadPage() {
  return (
    <PageContainer>
      <JsonLd data={buildSoftwareApplicationJsonLd()} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Download", path: "/download" },
        ])}
      />
      <JsonLd data={buildFaqJsonLd(distributionConfig.faqs)} />

      <Section spacing="md" background="surface" className="border-border border-b">
        <Container>
          <nav aria-label="Breadcrumb" className="text-muted mb-4 text-xs">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>{" "}
            / <span className="text-foreground font-medium">Download</span>
          </nav>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Take CertiDesk Pro Everywhere
            </h1>
            <p className="text-muted text-base leading-relaxed sm:text-lg">
              Install once. Access your institute management platform faster across
              Android, iPhone, iPad, Windows, macOS, and Linux.
            </p>
          </div>
        </Container>
      </Section>

      <Section spacing="md">
        <Container>
          <DownloadCenterClient />
        </Container>
      </Section>
    </PageContainer>
  );
}
