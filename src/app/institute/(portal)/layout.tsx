import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { buildPrivateNoIndexMetadata } from "@/lib/seo/metadata";
import { InstituteShell } from "@/components/institute/institute-shell";

export const metadata: Metadata = buildPrivateNoIndexMetadata("Institute Portal");

export default async function InstitutePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "institute_admin" && user.role !== "staff")) {
    redirect("/institute/login");
  }

  let institute;
  try {
    institute = await resolveAuthorizedInstitute(user);
  } catch {
    redirect("/institute/login");
  }

  return (
    <InstituteShell
      user={user}
      institute={{
        id: institute.id,
        name: institute.name,
        code: institute.code,
        walletBalancePaise: institute.walletBalancePaise,
        admissionFeePaise: institute.pricing.admissionFeePaise,
      }}
    >
      {children}
    </InstituteShell>
  );
}
