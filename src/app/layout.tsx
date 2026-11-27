import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { siteConfig } from "@/config/site";
import { Navbar, Footer } from "@/components/layout";
import { ConditionalMarketingChrome } from "@/components/layout/conditional-chrome";
import { ActionFeedbackProvider } from "@/components/ui/action-feedback-provider";
import { AnalyticsScripts } from "@/components/analytics/analytics-scripts";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: `${siteConfig.url}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [`${siteConfig.url}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth" className={inter.variable}>
      <body className="bg-background text-foreground flex min-h-screen flex-col antialiased">
        <AnalyticsScripts />
        <ActionFeedbackProvider>
          <a
            href="#main-content"
            className="focus:bg-primary sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
          >
            Skip to main content
          </a>
          <ConditionalMarketingChrome>
            <Navbar />
          </ConditionalMarketingChrome>
          <div className="flex-1">{children}</div>
          <ConditionalMarketingChrome>
            <Footer />
          </ConditionalMarketingChrome>
        </ActionFeedbackProvider>
      </body>
    </html>
  );
}
