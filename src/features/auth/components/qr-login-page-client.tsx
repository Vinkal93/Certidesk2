"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { signInWithCustomToken, signInWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import {
  QrCodeScanLogin,
  type QrCodeLoginStatus,
} from "@/components/ui/qr-code-scan-login";
import type { PortalType, UserRole } from "@/types/auth";

function mapRoleToPortal(role: UserRole): { portal: PortalType; home: string } {
  if (role === "super_admin") {
    return { portal: "super_admin", home: "/su/dashboard" };
  }
  if (role === "student") {
    return { portal: "student", home: "/student/dashboard" };
  }
  return { portal: "institute", home: "/institute/dashboard" };
}

export function QrLoginPageClient() {
  const router = useRouter();
  const [codeId, setCodeId] = React.useState<string>("");
  const [qrModules, setQrModules] = React.useState<boolean[][] | undefined>(undefined);
  const [expiresInSeconds, setExpiresInSeconds] = React.useState<number>(60);
  const [status, setStatus] = React.useState<QrCodeLoginStatus>("waiting");
  const [deviceName, setDeviceName] = React.useState<string>("your phone");
  const [welcomeMessage, setWelcomeMessage] = React.useState<string>("Welcome back");
  const [passwordPending, setPasswordPending] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | undefined>(undefined);
  const completingRef = React.useRef(false);

  const createSession = React.useCallback(async () => {
    completingRef.current = false;
    setStatus("waiting");
    setQrModules(undefined);
    try {
      const res = await fetch("/api/auth/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: {
          codeId: string;
          qrModules: boolean[][];
          expiresInSeconds: number;
        };
      };
      if (res.ok && json.ok && json.data) {
        setCodeId(json.data.codeId);
        setQrModules(json.data.qrModules);
        setExpiresInSeconds(json.data.expiresInSeconds);
      }
    } catch {
      setStatus("expired");
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    fetch("/api/auth/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create" }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          json: {
            ok?: boolean;
            data?: {
              codeId: string;
              qrModules: boolean[][];
              expiresInSeconds: number;
            };
          } | null
        ) => {
          if (!active) return;
          if (json?.ok && json.data) {
            setCodeId(json.data.codeId);
            setQrModules(json.data.qrModules);
            setExpiresInSeconds(json.data.expiresInSeconds);
          } else {
            setStatus("expired");
          }
        }
      )
      .catch(() => {
        if (active) setStatus("expired");
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!codeId || status === "expired" || status === "confirmed") return;

    const interval = window.setInterval(async () => {
      if (completingRef.current) return;
      try {
        const res = await fetch(`/api/auth/qr?codeId=${encodeURIComponent(codeId)}`);
        const json = (await res.json()) as {
          ok?: boolean;
          data?: {
            status: QrCodeLoginStatus;
            deviceName?: string;
            welcomeMessage?: string;
            customToken?: string;
            role?: UserRole;
          };
        };
        if (!res.ok || !json.ok || !json.data) return;
        const d = json.data;
        if (d.deviceName) setDeviceName(d.deviceName);
        if (d.welcomeMessage) setWelcomeMessage(d.welcomeMessage);

        if (d.status === "expired") {
          setStatus("expired");
          return;
        }
        if (d.status === "scanned") {
          setStatus("scanned");
          return;
        }
        if (d.status === "confirmed" && d.customToken && d.role) {
          completingRef.current = true;
          setStatus("confirmed");
          const { portal, home } = mapRoleToPortal(d.role);
          const cred = await signInWithCustomToken(getClientAuth(), d.customToken);
          const idToken = await cred.user.getIdToken(true);
          const sessionRes = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, portal }),
          });
          if (sessionRes.ok) {
            router.replace(home);
            router.refresh();
          } else {
            completingRef.current = false;
            setStatus("expired");
          }
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 1500);

    return () => window.clearInterval(interval);
  }, [codeId, status, router]);

  async function handlePasswordSubmit(email: string, password: string) {
    setPasswordPending(true);
    setPasswordError(undefined);
    try {
      const resolveRes = await fetch("/api/auth/resolve-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, portal: "institute" }),
      });
      const resolveJson = (await resolveRes.json()) as {
        ok?: boolean;
        data?: { loginEmail: string };
      };
      const authEmail =
        resolveRes.ok && resolveJson.ok && resolveJson.data?.loginEmail
          ? resolveJson.data.loginEmail
          : email;

      const cred = await signInWithEmailAndPassword(getClientAuth(), authEmail, password);
      const idToken = await cred.user.getIdToken(true);
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, portal: "institute" }),
      });
      if (!sessionRes.ok) {
        setPasswordError("Invalid credentials or portal mismatch.");
        return;
      }
      router.replace("/institute/dashboard");
      router.refresh();
    } catch {
      setPasswordError("Invalid email or password.");
    } finally {
      setPasswordPending(false);
    }
  }

  return (
    <div className="bg-surface flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[660px] space-y-4">
        <Link
          href="/login"
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Portal Selection
        </Link>

        <QrCodeScanLogin
          appName="CertiDesk Pro"
          logo={<GraduationCap className="size-5" aria-hidden="true" />}
          {...(qrModules ? { qrModules } : {})}
          codeId={codeId || "init"}
          status={status}
          onStatusChange={setStatus}
          expiresInSeconds={expiresInSeconds}
          deviceName={deviceName}
          welcomeMessage={welcomeMessage}
          autoplay={status === "waiting"}
          steps={[
            "Open CertiDesk on your signed-in phone",
            "Tap Profile → Scan & Login on PC",
            "Confirm to sign in instantly here",
          ]}
          onRefresh={() => void createSession()}
          onPasswordSubmit={handlePasswordSubmit}
          passwordPending={passwordPending}
          {...(passwordError ? { passwordError } : {})}
        />
      </div>
    </div>
  );
}
