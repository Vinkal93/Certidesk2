import type { Metadata } from "next";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { QrLoginPageClient } from "@/features/auth/components/qr-login-page-client";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "QR Code Sign In",
  "Scan the QR code using your signed-in CertiDesk mobile app to sign in on desktop."
);

export default function QrLoginPage() {
  return <QrLoginPageClient />;
}
