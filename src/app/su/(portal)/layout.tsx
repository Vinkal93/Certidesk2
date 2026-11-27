import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { institutesCollection } from "@/lib/firebase/firestore";
import { getRazorpayGatewayConfig } from "@/services/gateway.service";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { SuShell } from "@/components/su/su-shell";

export const metadata: Metadata = buildPrivateNoIndexMetadata("Super Admin Portal");

export default async function SuperAdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    redirect("/su");
  }

  const [suspendedSnap, gatewayConfig] = await Promise.all([
    institutesCollection().where("status", "==", "suspended").get(),
    getRazorpayGatewayConfig(),
  ]);

  return (
    <SuShell
      user={user}
      alerts={{
        suspendedInstitutes: suspendedSnap.size,
        gatewayEnabled: gatewayConfig.enabled,
      }}
    >
      {children}
    </SuShell>
  );
}
