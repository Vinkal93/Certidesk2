"use client";

import * as React from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Monitor,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionUser } from "@/types/auth";

interface Props {
  user: SessionUser;
  initialCodeId?: string | undefined;
  initialToken?: string | undefined;
}

function parseQrPayload(raw: string): { codeId: string; token: string } | null {
  try {
    const url = new URL(raw);
    const codeId = url.searchParams.get("codeId");
    const token = url.searchParams.get("token");
    if (codeId && token) return { codeId, token };
  } catch {
    // Ignore non-URL QR payloads
  }
  return null;
}

export function QrScannerClient({ user, initialCodeId, initialToken }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [scannedData, setScannedData] = React.useState<{
    codeId: string;
    token: string;
  } | null>(
    initialCodeId && initialToken ? { codeId: initialCodeId, token: initialToken } : null
  );
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const stopCamera = React.useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (scannedData) {
      let active = true;
      fetch("/api/auth/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          codeId: scannedData.codeId,
          token: scannedData.token,
          deviceName: "Mobile App",
        }),
      })
        .then(async (res) => {
          if (!active || res.ok) return;
          const json = (await res.json()) as { error?: { message?: string } };
          if (active) setError(json.error?.message ?? "QR code expired or invalid.");
        })
        .catch(() => {
          if (active) setError("Network error while verifying QR code.");
        });
      return () => {
        active = false;
      };
    }

    let cancelled = false;
    let rafId = 0;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera access is not supported in this browser. Open via HTTPS or PWA."
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const scanFrame = () => {
          if (cancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imgData.data, imgData.width, imgData.height);
              if (code?.data) {
                const parsed = parseQrPayload(code.data);
                if (parsed) {
                  stopCamera();
                  setScannedData(parsed);
                  return;
                }
              }
            }
          }
          rafId = window.requestAnimationFrame(scanFrame);
        };

        rafId = window.requestAnimationFrame(scanFrame);
      } catch {
        setCameraError(
          "Camera permission denied or unavailable. Allow camera access to scan the PC QR code."
        );
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      stopCamera();
    };
  }, [scannedData, stopCamera]);

  async function handleConfirm() {
    if (!scannedData) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          codeId: scannedData.codeId,
          token: scannedData.token,
          deviceName: "Mobile App",
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to confirm desktop login.");
        return;
      }
      setConfirmed(true);
    } catch {
      setError("Network error while confirming desktop login.");
    } finally {
      setConfirming(false);
    }
  }

  const dashboardHref =
    user.role === "super_admin"
      ? "/su/dashboard"
      : user.role === "student"
        ? "/student/dashboard"
        : "/institute/dashboard";

  return (
    <div className="bg-surface flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Link
          href={dashboardHref}
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Dashboard
        </Link>

        <Card className="overflow-hidden rounded-3xl">
          <CardHeader className="border-border border-b pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="text-primary h-4 w-4" aria-hidden="true" />
                Scan &amp; Login on PC
              </CardTitle>
              <Badge variant="navy">{user.role}</Badge>
            </div>
            <p className="text-muted text-xs">
              Signed in as <strong className="text-foreground">{user.email}</strong>
            </p>
          </CardHeader>

          <CardContent className="space-y-4 pt-5">
            {error && (
              <div className="bg-danger-soft text-danger rounded-xl p-3 text-xs">
                {error}
              </div>
            )}

            {confirmed ? (
              <div className="space-y-3 py-4 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                </span>
                <h2 className="text-foreground text-lg font-bold">Desktop Signed In!</h2>
                <p className="text-muted text-xs">
                  Your PC browser is now authenticated as {user.email}.
                </p>
                <Link
                  href={dashboardHref}
                  className="bg-primary inline-flex h-10 items-center justify-center rounded-xl px-5 text-xs font-semibold text-white"
                >
                  Return to Dashboard
                </Link>
              </div>
            ) : scannedData ? (
              <div className="space-y-4 py-2 text-center">
                <span className="bg-primary-soft text-primary mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
                  <Monitor className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-foreground text-base font-bold">
                    Approve Desktop Sign-In?
                  </h2>
                  <p className="text-muted mt-1 text-xs">
                    Confirming will sign your PC browser into{" "}
                    <strong className="text-foreground">{user.email}</strong>.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    loading={confirming}
                    onClick={handleConfirm}
                  >
                    <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Confirm &amp; Sign In PC
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    disabled={confirming}
                    onClick={() => {
                      setScannedData(null);
                      setError(null);
                    }}
                  >
                    Scan Different QR Code
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cameraError ? (
                  <div className="border-border bg-background rounded-2xl border p-6 text-center">
                    <Camera
                      className="text-muted mx-auto mb-2 h-8 w-8"
                      aria-hidden="true"
                    />
                    <p className="text-foreground text-xs font-semibold">
                      Camera Unavailable
                    </p>
                    <p className="text-muted mt-1 text-xs">{cameraError}</p>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-slate-950">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="aspect-square w-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>
                )}
                <p className="text-muted text-center text-xs">
                  Point your phone camera at the QR code shown on{" "}
                  <span className="text-foreground font-medium">/login/qr</span> on your
                  PC.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
