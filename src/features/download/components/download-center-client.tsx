"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Apple,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Laptop,
  Monitor,
  Smartphone,
  Terminal,
} from "lucide-react";
import { usePwa, type DetectedPlatform } from "@/components/pwa/pwa-provider";
import { distributionConfig, type PlatformDistributionInfo } from "@/config/distribution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PLATFORM_ICONS: Record<
  PlatformDistributionInfo["id"],
  React.ComponentType<{ className?: string }>
> = {
  android: Smartphone,
  ios: Apple,
  windows: Monitor,
  macos: Laptop,
  linux: Terminal,
  web: Globe,
};

export function DownloadCenterClient() {
  const router = useRouter();
  const { canPromptInstall, isStandalone, platform, promptInstall } = usePwa();
  const [installFeedback, setInstallFeedback] = React.useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = React.useState<
    PlatformDistributionInfo["id"] | null
  >(null);

  const effectivePlatform: PlatformDistributionInfo["id"] =
    selectedPlatform ??
    (platform !== "unknown"
      ? (platform as DetectedPlatform & PlatformDistributionInfo["id"])
      : "android");

  async function handleInstall(platformId: PlatformDistributionInfo["id"]) {
    setSelectedPlatform(platformId);
    setInstallFeedback(null);

    if (platformId === "web") {
      router.push("/login");
      return;
    }

    if (canPromptInstall) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setInstallFeedback("CertiDesk Pro is being installed on your device.");
        return;
      }
    }

    const target = distributionConfig.platforms.find((p) => p.id === platformId);
    if (target) {
      setInstallFeedback(
        `Follow the ${target.name} steps below (${target.installMethod}).`
      );
    }
  }

  const activePlatform =
    distributionConfig.platforms.find((p) => p.id === effectivePlatform) ??
    distributionConfig.platforms[0]!;

  return (
    <div className="space-y-12">
      {/* Primary Install Action Bar */}
      <div className="border-border bg-surface flex flex-col justify-between gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">Version {distributionConfig.version}</Badge>
            {isStandalone && <Badge variant="success">Installed Standalone App</Badge>}
            {platform !== "unknown" && (
              <Badge variant="outline">Detected: {platform.toUpperCase()}</Badge>
            )}
          </div>
          <p className="text-foreground text-sm font-semibold">
            {isStandalone
              ? "You are currently running the installed CertiDesk Pro app."
              : canPromptInstall
                ? "Your browser supports 1-click native PWA installation."
                : "Select your device below for instant installation steps."}
          </p>
          {installFeedback && (
            <p className="text-primary text-xs font-medium">{installFeedback}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          {canPromptInstall && !isStandalone && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => handleInstall(effectivePlatform)}
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Install App Now
            </Button>
          )}
          <Link
            href="/login"
            className="border-border bg-background text-foreground hover:bg-surface inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-sm font-semibold"
          >
            Open Web Portal
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Platform Selection Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {distributionConfig.platforms.map((item) => {
          const Icon = PLATFORM_ICONS[item.id];
          const isSelected = activePlatform.id === item.id;
          return (
            <Card
              key={item.id}
              className={`flex flex-col justify-between transition ${
                isSelected ? "border-primary ring-primary/15 ring-2" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <span className="bg-primary-soft text-primary flex h-11 w-11 items-center justify-center rounded-xl">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Badge variant="outline">{item.version}</Badge>
                </div>
                <CardTitle className="mt-3 text-lg">{item.name}</CardTitle>
                <p className="text-muted text-xs">{item.subtitle}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 text-xs">
                  <p className="text-foreground">
                    <span className="text-muted font-medium">Method: </span>
                    {item.installMethod}
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted font-medium">Compatibility: </span>
                    {item.compatibility}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={isSelected ? "primary" : "outline"}
                    size="sm"
                    fullWidth
                    onClick={() => handleInstall(item.id)}
                  >
                    {item.id === "web"
                      ? "Launch Web App"
                      : canPromptInstall &&
                          (item.id === "android" ||
                            item.id === "windows" ||
                            item.id === "macos" ||
                            item.id === "linux")
                        ? `Install on ${item.name}`
                        : `View ${item.name} Steps`}
                  </Button>

                  {item.id === "android" && distributionConfig.playStoreUrl && (
                    <a
                      href={distributionConfig.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex w-full items-center justify-center gap-1 text-xs font-semibold hover:underline"
                    >
                      Get on Google Play
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Platform Step-by-Step Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            How to Install on {activePlatform.name}
          </CardTitle>
          <p className="text-muted text-sm">{activePlatform.compatibility}</p>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {activePlatform.steps.map((step, idx) => (
              <li key={step} className="flex items-start gap-3 text-sm">
                <span className="bg-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <span className="text-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Technical Distribution Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-border bg-surface rounded-xl border p-4">
            <p className="text-muted text-xs">Application Version</p>
            <p className="text-foreground mt-1 font-bold">{distributionConfig.version}</p>
          </div>
          <div className="border-border bg-surface rounded-xl border p-4">
            <p className="text-muted text-xs">Release Date</p>
            <p className="text-foreground mt-1 font-bold">
              {distributionConfig.releaseDate}
            </p>
          </div>
          <div className="border-border bg-surface rounded-xl border p-4">
            <p className="text-muted text-xs">Supported Platforms</p>
            <p className="text-foreground mt-1 text-xs font-semibold">
              {distributionConfig.supportedPlatformsSummary}
            </p>
          </div>
          <div className="border-border bg-surface rounded-xl border p-4">
            <p className="text-muted text-xs">Requirements</p>
            <p className="text-foreground mt-1 text-xs font-semibold">
              {distributionConfig.requirements}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <div className="space-y-4">
        <h2 className="text-foreground text-2xl font-bold tracking-tight">
          Installation &amp; App FAQ
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {distributionConfig.faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start gap-2 text-base">
                  <CheckCircle2
                    className="text-primary mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-sm leading-relaxed">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
