"use client";

import * as React from "react";
import { Download, RefreshCw, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type DetectedPlatform =
  "android" | "ios" | "windows" | "macos" | "linux" | "unknown";

interface PwaContextValue {
  canPromptInstall: boolean;
  isStandalone: boolean;
  platform: DetectedPlatform;
  updateAvailable: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  applyUpdate: () => void;
}

const PwaContext = React.createContext<PwaContextValue>({
  canPromptInstall: false,
  isStandalone: false,
  platform: "unknown",
  updateAvailable: false,
  promptInstall: async () => "unavailable",
  applyUpdate: () => undefined,
});

export function usePwa() {
  return React.useContext(PwaContext);
}

function detectClientPlatform(): DetectedPlatform {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/win/.test(ua)) return "windows";
  if (/macintosh|mac os x/.test(ua)) return "macos";
  if (/linux/.test(ua)) return "linux";
  return "unknown";
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [platform, setPlatform] = React.useState<DetectedPlatform>("unknown");
  const [updateWaiting, setUpdateWaiting] = React.useState<ServiceWorker | null>(null);
  const [dismissUpdateBanner, setDismissUpdateBanner] = React.useState(false);

  React.useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setPlatform(detectClientPlatform());
      const standaloneMatch =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((window.navigator as { standalone?: boolean }).standalone);
      setIsStandalone(standaloneMatch);
    }, 0);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (reg.waiting) {
            setUpdateWaiting(reg.waiting);
          }
          reg.addEventListener("updatefound", () => {
            const nextWorker = reg.installing;
            if (!nextWorker) return;
            nextWorker.addEventListener("statechange", () => {
              if (
                nextWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateWaiting(nextWorker);
              }
            });
          });
        })
        .catch(() => undefined);
    }

    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  const applyUpdate = React.useCallback(() => {
    if (!updateWaiting) return;
    updateWaiting.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }, [updateWaiting]);

  return (
    <PwaContext.Provider
      value={{
        canPromptInstall: Boolean(deferredPrompt),
        isStandalone,
        platform,
        updateAvailable: Boolean(updateWaiting),
        promptInstall,
        applyUpdate,
      }}
    >
      {children}

      {updateWaiting && !dismissUpdateBanner && (
        <div
          role="status"
          className="border-border bg-background fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl border p-3.5 shadow-xl"
        >
          <span className="bg-primary-soft text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <Download className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 text-xs">
            <p className="text-foreground font-semibold">App Update Ready</p>
            <p className="text-muted">Refresh to load the latest CertiDesk Pro.</p>
          </div>
          <button
            type="button"
            onClick={applyUpdate}
            className="bg-primary inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Update
          </button>
          <button
            type="button"
            aria-label="Dismiss update notification"
            onClick={() => setDismissUpdateBanner(true)}
            className="text-muted hover:text-foreground cursor-pointer p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </PwaContext.Provider>
  );
}
