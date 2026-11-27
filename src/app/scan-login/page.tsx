import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { QrScannerClient } from "@/features/auth/components/qr-scanner-client";

export const metadata: Metadata = buildPrivateNoIndexMetadata(
  "Scan & Login on PC",
  "Use your signed-in mobile session to approve a desktop QR login."
);

export default async function ScanLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ codeId?: string; token?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const sp = await searchParams;

  return (
    <QrScannerClient user={user} initialCodeId={sp.codeId} initialToken={sp.token} />
  );
}
